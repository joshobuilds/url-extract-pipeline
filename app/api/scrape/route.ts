import { NextResponse } from 'next/server';
import { z } from 'zod';
import { extract } from '@/lib/extractor';
import { fetchAndClean } from '@/lib/fetcher';
import { extractionSchema, parseSchemaYaml } from '@/lib/schema';
import { PRESETS } from '@/lib/presets';

export const runtime = 'nodejs';
export const maxDuration = 60;

const bodySchema = z.object({
  url: z.string().min(1),
  preset: z.string().optional(),
  schemaYaml: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
    }
    const { url, preset, schemaYaml } = parsed.data;

    let schema;
    if (schemaYaml && schemaYaml.trim()) {
      try {
        schema = parseSchemaYaml(schemaYaml);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json(
          { ok: false, error: `Schema YAML is invalid: ${msg}` },
          { status: 400 },
        );
      }
    } else if (preset && PRESETS[preset]) {
      schema = extractionSchema.parse(parseSchemaYaml(PRESETS[preset].yaml));
    } else {
      return NextResponse.json(
        { ok: false, error: 'Provide either a preset name or schemaYaml.' },
        { status: 400 },
      );
    }

    let page;
    try {
      page = await fetchAndClean(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }

    const result = await extract(page.html, page.finalUrl, schema);
    if (page.truncated) {
      result.warnings.push(
        `Page content was truncated at ${Math.round(page.byteCount / 1024)}KB; later sections may be missing.`,
      );
    }

    return NextResponse.json({
      ok: true,
      result,
      schema,
      page: {
        finalUrl: page.finalUrl,
        contentType: page.contentType,
        byteCount: page.byteCount,
        truncated: page.truncated,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
