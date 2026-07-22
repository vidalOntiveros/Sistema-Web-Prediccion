// Arma el mapa `features` del contrato de ADR-0001 a partir de un estudiante.
// Deliberadamente genérico: no depende de qué columnas exista hoy el catálogo,
// para que agregar/quitar columnas de `extraData` no requiera tocar este módulo.

export type FeatureValue = string | number | boolean | null;

export interface StudentForPayload {
  career: string;
  semester: number;
  extraData: Record<string, unknown>;
}

export function buildPredictionPayload(
  student: StudentForPayload,
): Record<string, FeatureValue> {
  const features: Record<string, FeatureValue> = {
    career: student.career,
    semester: student.semester,
  };

  for (const [key, value] of Object.entries(student.extraData)) {
    features[key] = normalizeFeatureValue(value);
  }

  return features;
}

function normalizeFeatureValue(value: unknown): FeatureValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  return null;
}
