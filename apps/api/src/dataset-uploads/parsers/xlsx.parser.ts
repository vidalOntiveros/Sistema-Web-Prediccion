import * as XLSX from 'xlsx';
import { ParsedDatasetRow } from './parsed-dataset-row';

export function parseXlsx(buffer: Buffer): ParsedDatasetRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const records = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    raw: false,
    defval: '',
  });

  return records.map((values, index) => ({
    rowNumber: index + 2, // fila 1 = encabezado
    values,
  }));
}
