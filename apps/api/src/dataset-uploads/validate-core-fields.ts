import { DatasetRowError } from './dataset-uploads.exceptions';

/**
 * Encabezados esperados para las columnas núcleo del estudiante en el archivo
 * subido. No hay todavía un dataset real del ITM que confirme esta convención
 * — supuesto temporal documentado en docs/estado-proyecto.md §6, a ajustar
 * cuando exista el formato definitivo.
 */
export const CORE_FIELD = {
  controlNumber: 'numero_control',
  fullName: 'nombre',
  career: 'carrera',
  semester: 'semestre',
} as const;

export interface ValidatedCoreFields {
  controlNumber: string;
  fullName: string;
  career: string;
  semester: number;
}

export function validateCoreFields(
  rowNumber: number,
  values: Record<string, string>,
): { data: ValidatedCoreFields | null; errors: DatasetRowError[] } {
  const errors: DatasetRowError[] = [];

  const controlNumber = values[CORE_FIELD.controlNumber]?.trim();
  if (!controlNumber) {
    errors.push({
      row: rowNumber,
      field: CORE_FIELD.controlNumber,
      issue: 'es obligatorio',
    });
  }

  const fullName = values[CORE_FIELD.fullName]?.trim();
  if (!fullName) {
    errors.push({
      row: rowNumber,
      field: CORE_FIELD.fullName,
      issue: 'es obligatorio',
    });
  }

  const career = values[CORE_FIELD.career]?.trim();
  if (!career) {
    errors.push({
      row: rowNumber,
      field: CORE_FIELD.career,
      issue: 'es obligatorio',
    });
  }

  const semesterRaw = values[CORE_FIELD.semester];
  const semester = Number(semesterRaw);
  const semesterValid =
    !!semesterRaw &&
    Number.isInteger(semester) &&
    semester >= 1 &&
    semester <= 20;
  if (!semesterValid) {
    errors.push({
      row: rowNumber,
      field: CORE_FIELD.semester,
      issue: 'debe ser un entero entre 1 y 20',
    });
  }

  if (errors.length > 0) {
    return { data: null, errors };
  }

  return {
    data: {
      controlNumber: controlNumber,
      fullName: fullName,
      career: career,
      semester,
    },
    errors: [],
  };
}
