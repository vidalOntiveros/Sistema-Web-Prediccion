// Validación de `extraData` contra el catálogo dinámico (`DatasetColumnDefinition`).
// Compartida entre StudentsService y (Fase 3) DatasetUploadsService — no se puede
// expresar con class-validator porque el schema es dinámico. Ver
// docs/07-diseno-modulos-nestjs.md §3.4.

export type DatasetColumnDataType = 'string' | 'number' | 'boolean' | 'date';

export interface DatasetColumnCatalogEntry {
  key: string;
  dataType: DatasetColumnDataType;
  required: boolean;
}

export interface ExtraDataFieldError {
  field: string;
  issue: string;
}

export interface ValidateExtraDataResult {
  data: Record<string, unknown>;
  errors: ExtraDataFieldError[];
}

export function validateExtraData(
  catalog: DatasetColumnCatalogEntry[],
  input: Record<string, unknown>,
): ValidateExtraDataResult {
  const data: Record<string, unknown> = {};
  const errors: ExtraDataFieldError[] = [];

  for (const column of catalog) {
    const rawValue = input[column.key];
    const isMissing =
      rawValue === undefined || rawValue === null || rawValue === '';

    if (isMissing) {
      if (column.required) {
        errors.push({ field: column.key, issue: 'es obligatorio' });
      }
      continue;
    }

    const coerced = coerceValue(rawValue, column.dataType);
    if (!coerced.ok) {
      errors.push({
        field: column.key,
        issue: `debe ser de tipo ${column.dataType}`,
      });
      continue;
    }
    data[column.key] = coerced.value;
  }

  return { data, errors };
}

function coerceValue(
  value: unknown,
  dataType: DatasetColumnDataType,
): { ok: true; value: unknown } | { ok: false } {
  switch (dataType) {
    case 'string':
      return typeof value === 'string' && value.length > 0
        ? { ok: true, value }
        : { ok: false };
    case 'number': {
      const num = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(num) ? { ok: true, value: num } : { ok: false };
    }
    case 'boolean': {
      if (typeof value === 'boolean') return { ok: true, value };
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === '1')
          return { ok: true, value: true };
        if (normalized === 'false' || normalized === '0')
          return { ok: true, value: false };
      }
      return { ok: false };
    }
    case 'date': {
      const date = new Date(value as string);
      return Number.isNaN(date.getTime())
        ? { ok: false }
        : { ok: true, value: date.toISOString() };
    }
  }
}
