import {
  DatasetColumnCatalogEntry,
  validateExtraData,
} from './validate-extra-data';

const catalog: DatasetColumnCatalogEntry[] = [
  { key: 'promedio_general', dataType: 'number', required: true },
  { key: 'adeudos', dataType: 'boolean', required: false },
  { key: 'sexo', dataType: 'string', required: false },
];

describe('validateExtraData', () => {
  it('accepts a fully valid row and coerces string-typed values', () => {
    const { data, errors } = validateExtraData(catalog, {
      promedio_general: '8.5',
      adeudos: 'true',
      sexo: 'F',
    });

    expect(errors).toEqual([]);
    expect(data).toEqual({ promedio_general: 8.5, adeudos: true, sexo: 'F' });
  });

  it('reports a missing required field', () => {
    const { errors } = validateExtraData(catalog, { adeudos: false });
    expect(errors).toEqual([
      { field: 'promedio_general', issue: 'es obligatorio' },
    ]);
  });

  it('does not require optional fields', () => {
    const { data, errors } = validateExtraData(catalog, {
      promedio_general: 9,
    });
    expect(errors).toEqual([]);
    expect(data).toEqual({ promedio_general: 9 });
  });

  it('reports a type mismatch instead of silently coercing garbage', () => {
    const { errors } = validateExtraData(catalog, {
      promedio_general: 'no-es-un-numero',
    });
    expect(errors).toEqual([
      { field: 'promedio_general', issue: 'debe ser de tipo number' },
    ]);
  });

  it('ignores columns not present in the catalog', () => {
    const { data, errors } = validateExtraData(catalog, {
      promedio_general: 8,
      columna_desconocida: 'x',
    });
    expect(errors).toEqual([]);
    expect(data).toEqual({ promedio_general: 8 });
  });
});
