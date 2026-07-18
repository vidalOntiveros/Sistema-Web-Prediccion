import { parseCsv } from './csv.parser';

describe('parseCsv', () => {
  it('maps each data row to its 1-indexed spreadsheet row number', () => {
    const csv = 'numero_control,nombre\n2023,Ana\n2024,Luis\n';
    const rows = parseCsv(Buffer.from(csv, 'utf-8'));

    expect(rows).toEqual([
      { rowNumber: 2, values: { numero_control: '2023', nombre: 'Ana' } },
      { rowNumber: 3, values: { numero_control: '2024', nombre: 'Luis' } },
    ]);
  });

  it('trims whitespace and ignores empty lines', () => {
    const csv = 'numero_control,nombre\n 2023 , Ana \n\n';
    const rows = parseCsv(Buffer.from(csv, 'utf-8'));

    expect(rows).toEqual([
      { rowNumber: 2, values: { numero_control: '2023', nombre: 'Ana' } },
    ]);
  });

  it('strips a UTF-8 BOM instead of folding it into the first header', () => {
    const csv = '﻿numero_control,nombre\n2023,Ana\n';
    const rows = parseCsv(Buffer.from(csv, 'utf-8'));

    expect(Object.keys(rows[0].values)).toEqual(['numero_control', 'nombre']);
  });
});
