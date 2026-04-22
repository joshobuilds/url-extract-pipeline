import ExcelJS from 'exceljs';
import type { ExtractionSchema } from './schema';
import type { ExtractionResult } from './extractor';

export async function buildExcel(
  schema: ExtractionSchema,
  result: ExtractionResult,
  sourceUrl: string,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Extraction');

  const fieldNames = schema.fields.map((f) => f.name);
  const headers = ['source_url', ...fieldNames, 'confidence', 'missing_fields', 'warnings', 'model_used'];

  ws.columns = headers.map((h) => ({ header: h, key: h, width: 22 }));

  const rows: Record<string, unknown>[] =
    schema.mode === 'list'
      ? result.items.map((it) => buildRow(it, fieldNames))
      : [buildRow(result.data, fieldNames)];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    r.source_url = sourceUrl;
    // Put confidence/warnings on the first row only; repeat them on each
    // row for convenience when filtering a list export.
    r.confidence = result.confidence;
    r.missing_fields = result.missing_fields.join(', ');
    r.warnings = i === 0 ? result.warnings.join(' | ') : '';
    r.model_used = result.model_used;
    ws.addRow(r);
  }

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2F5496' },
  };
  header.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

function buildRow(data: Record<string, unknown>, fieldNames: string[]): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const name of fieldNames) {
    const v = data[name];
    if (Array.isArray(v)) row[name] = v.join(', ');
    else if (v === null || v === undefined) row[name] = '';
    else row[name] = v;
  }
  return row;
}
