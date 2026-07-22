import { buildPredictionPayload } from './build-prediction-payload';

describe('buildPredictionPayload', () => {
  it('merges core columns with extraData into a flat features map', () => {
    const features = buildPredictionPayload({
      career: 'ISC',
      semester: 5,
      extraData: { promedio_general: 8.1, materias_reprobadas: 2, adeudos: 0 },
    });

    expect(features).toEqual({
      career: 'ISC',
      semester: 5,
      promedio_general: 8.1,
      materias_reprobadas: 2,
      adeudos: 0,
    });
  });

  it('passes through booleans and nulls without altering them', () => {
    const features = buildPredictionPayload({
      career: 'ISC',
      semester: 1,
      extraData: { adeudos: true, sexo: null },
    });

    expect(features.adeudos).toBe(true);
    expect(features.sexo).toBeNull();
  });

  it('normalizes values it cannot represent in the contract to null', () => {
    const features = buildPredictionPayload({
      career: 'ISC',
      semester: 1,
      extraData: { rareValue: { nested: true } },
    });

    expect(features.rareValue).toBeNull();
  });

  it('does not depend on which extraData keys exist', () => {
    const features = buildPredictionPayload({
      career: 'ISC',
      semester: 1,
      extraData: {},
    });

    expect(features).toEqual({ career: 'ISC', semester: 1 });
  });
});
