import { Type, type FunctionDeclaration, type Schema } from '@google/genai';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

export const fieldDefSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'integer', 'boolean', 'date', 'array']),
  required: z.boolean().optional().default(false),
  description: z.string().optional(),
  enum: z.array(z.string()).optional(),
  item_type: z.enum(['string', 'number', 'integer', 'boolean', 'date']).optional(),
});

export const extractionSchema = z.object({
  name: z.string(),
  description: z.string().optional().default(''),
  instructions: z.string().optional().default(''),
  mode: z.enum(['single', 'list']).optional().default('single'),
  fields: z.array(fieldDefSchema).min(1),
});

export type FieldDef = z.infer<typeof fieldDefSchema>;
export type ExtractionSchema = z.infer<typeof extractionSchema>;

export function parseSchemaYaml(yaml: string): ExtractionSchema {
  const raw = parseYaml(yaml);
  return extractionSchema.parse(raw);
}

const TYPE_MAP: Record<FieldDef['type'], Type> = {
  string: Type.STRING,
  number: Type.NUMBER,
  integer: Type.INTEGER,
  boolean: Type.BOOLEAN,
  date: Type.STRING,
  array: Type.ARRAY,
};

function fieldToGeminiProp(field: FieldDef): Schema {
  const prop: Schema = { type: TYPE_MAP[field.type] };
  if (field.description) prop.description = field.description;
  if (field.enum && field.enum.length) prop.enum = field.enum;
  if (field.type === 'date' && !prop.description) {
    prop.description = 'ISO date YYYY-MM-DD';
  }
  if (field.type === 'array') {
    const itemType = field.item_type ?? 'string';
    prop.items = { type: TYPE_MAP[itemType] };
  }
  if (!field.required) prop.nullable = true;
  return prop;
}

export function schemaToGeminiTool(schema: ExtractionSchema): FunctionDeclaration {
  const fieldProps: Record<string, Schema> = {};
  const fieldRequired: string[] = [];
  for (const f of schema.fields) {
    fieldProps[f.name] = fieldToGeminiProp(f);
    if (f.required) fieldRequired.push(f.name);
  }

  let properties: Record<string, Schema>;
  let required: string[];

  if (schema.mode === 'list') {
    properties = {
      items: {
        type: Type.ARRAY,
        description: 'One record per item found on the page. Empty array if none found.',
        items: {
          type: Type.OBJECT,
          properties: fieldProps,
          required: fieldRequired,
        },
      },
    };
    required = ['items'];
  } else {
    properties = { ...fieldProps };
    required = [...fieldRequired];
  }

  properties._confidence = {
    type: Type.NUMBER,
    description: 'Confidence 0.0 to 1.0.',
    minimum: 0,
    maximum: 1,
  };
  properties._missing_fields = {
    type: Type.ARRAY,
    items: { type: Type.STRING },
    description: 'Required fields that could not be found.',
  };
  properties._warnings = {
    type: Type.ARRAY,
    items: { type: Type.STRING },
    description: 'Notes on ambiguity, partial data, or page quirks.',
  };
  required.push('_confidence', '_missing_fields', '_warnings');

  return {
    name: 'record_extraction',
    description: `Record extracted data from the HTML page. Schema: ${schema.name}. Mode: ${schema.mode}.`,
    parameters: {
      type: Type.OBJECT,
      properties,
      required,
    },
  };
}

export function buildSystemPrompt(schema: ExtractionSchema): string {
  const fieldLines = schema.fields.map((f) => {
    let line = `- ${f.name} (${f.type})`;
    if (f.required) line += ' [required]';
    if (f.description) line += `: ${f.description}`;
    if (f.enum?.length) line += ` | allowed: ${f.enum.join(', ')}`;
    return line;
  });

  const modeBlurb =
    schema.mode === 'list'
      ? `Task: the user will provide a URL and a cleaned-up HTML dump of that page. Find every repeating item on the page that matches the schema and return one record per item in the \`items\` array. If the page has no such items, return an empty array.`
      : `Task: the user will provide a URL and a cleaned-up HTML dump of that page. Extract a single record that matches the schema.`;

  let base = `You are a web-page data extractor.

${modeBlurb}

You MUST call the \`record_extraction\` function. Never reply with prose.

Schema: ${schema.name}
${schema.description}

Fields:
${fieldLines.join('\n')}

Rules:
- If a field is not present, return null. Do not hallucinate.
- Dates: output ISO YYYY-MM-DD.
- Numbers: strip currency symbols and thousand separators.
- URLs: return absolute URLs. Resolve relative links against the page URL.
- _confidence: 0.0 to 1.0 reflecting how sure you are.
- _missing_fields: required field names that could not be found.
- _warnings: notes on ambiguity, pagination, partial data, or page quirks.
- Call the function exactly once.`;

  if (schema.instructions) {
    base += `\n\nSchema-specific rules:\n${schema.instructions}`;
  }
  return base;
}
