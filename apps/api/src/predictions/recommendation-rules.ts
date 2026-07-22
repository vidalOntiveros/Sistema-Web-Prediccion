// Tabla de reglas riskLevel → recomendaciones de intervención (ADR-0002).
// Generadas por el API, no por el servicio ML — "canalizar a tutoría" es una
// política institucional, no una salida de un clasificador de riesgo.

export interface Recommendation {
  title: string;
  description: string;
}

const RECOMMENDATION_RULES: Record<string, Recommendation[]> = {
  high: [
    {
      title: 'Canalizar a tutoría académica',
      description:
        'Agendar una sesión con el tutor asignado en las próximas dos semanas para revisar el plan de estudios y detectar las causas del riesgo.',
    },
    {
      title: 'Notificar a coordinación de carrera',
      description:
        'Informar a la coordinación para dar seguimiento cercano al caso y valorar apoyos adicionales (becas, asesorías).',
    },
  ],
  medium: [
    {
      title: 'Seguimiento con el docente asignado',
      description:
        'El docente debe dar seguimiento al desempeño del estudiante en el siguiente parcial y reportar cualquier cambio.',
    },
  ],
  low: [
    {
      title: 'Sin acción inmediata',
      description:
        'El estudiante no muestra señales de riesgo relevantes; continuar con el seguimiento regular.',
    },
  ],
};

export function getRecommendations(riskLevel: string): Recommendation[] {
  return RECOMMENDATION_RULES[riskLevel] ?? [];
}
