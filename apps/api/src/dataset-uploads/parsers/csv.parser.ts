import { parse } from 'csv-parse/sync';
import { ParsedDatasetRow } from './parsed-dataset-row';

export function parseCsv(buffer: Buffer): ParsedDatasetRow[] {
  const records: Record<string, string>[] = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  return records.map((values, index) => ({
    rowNumber: index + 2, // fila 1 = encabezado
    values,
  }));
}
