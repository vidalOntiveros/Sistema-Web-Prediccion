// Formato común de salida de los dos parsers (csv.parser.ts, xlsx.parser.ts),
// para que DatasetUploadsService valide/procese filas sin saber de qué formato vinieron.
export interface ParsedDatasetRow {
  /** 1-indexado, igual a como se ve en Excel/hoja de cálculo (fila 1 = encabezado). */
  rowNumber: number;
  values: Record<string, string>;
}
