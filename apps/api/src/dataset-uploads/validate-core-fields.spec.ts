import { validateCoreFields } from './validate-core-fields';

describe('validateCoreFields', () => {
  it('accepts a fully valid row', () => {
    const { data, errors } = validateCoreFields(2, {
      numero_control: '20231001',
      nombre: 'Ana Torres',
      carrera: 'ISC',
      semestre: '5',
    });

    expect(errors).toEqual([]);
    expect(data).toEqual({
      controlNumber: '20231001',
      fullName: 'Ana Torres',
      career: 'ISC',
      semester: 5,
    });
  });

  it('reports every missing required core column, tagged with the row number', () => {
    const { data, errors } = validateCoreFields(3, {
      numero_control: '',
      nombre: '',
      carrera: '',
      semestre: '',
    });

    expect(data).toBeNull();
    expect(errors).toEqual([
      { row: 3, field: 'numero_control', issue: 'es obligatorio' },
      { row: 3, field: 'nombre', issue: 'es obligatorio' },
      { row: 3, field: 'carrera', issue: 'es obligatorio' },
      { row: 3, field: 'semestre', issue: 'debe ser un entero entre 1 y 20' },
    ]);
  });

  it('rejects a non-numeric semester', () => {
    const { errors } = validateCoreFields(2, {
      numero_control: '1',
      nombre: 'X',
      carrera: 'ISC',
      semestre: 'quinto',
    });
    expect(errors).toEqual([
      { row: 2, field: 'semestre', issue: 'debe ser un entero entre 1 y 20' },
    ]);
  });

  it('rejects a semester out of the 1-20 range', () => {
    const { errors } = validateCoreFields(2, {
      numero_control: '1',
      nombre: 'X',
      carrera: 'ISC',
      semestre: '21',
    });
    expect(errors).toEqual([
      { row: 2, field: 'semestre', issue: 'debe ser un entero entre 1 y 20' },
    ]);
  });
});
