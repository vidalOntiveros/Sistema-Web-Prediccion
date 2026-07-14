# ADR-0001: Contrato de integración con el servicio de ML

**Estado:** Aceptado — 2026-07-10
**Sustituye:** el ejemplo de contrato en la plantilla original de prompt (`probabilidad`/`riesgo`/`recomendacion`).

## Contexto

El modelo de ML lo entrenan y definen las compañeras del usuario; a la fecha de esta decisión no existe modelo real ni dataset definitivo. El objetivo es construir el backend y frontend sin bloquear el desarrollo, usando un mock en FastAPI que cumpla exactamente el contrato que usará el modelo real después. Existían además dos versiones inconsistentes del contrato entre la plantilla de prompt original (español, `probabilidad`/`riesgo`/`recomendacion`, string único) y `03-arquitectura.md`/`04-diseno-base-datos.md` (inglés, `riskLevel`/`score`/`topFactors[]`, `PredictionRecommendation` como entidad).

## Opciones consideradas

1. Mantener el contrato en español de la plantilla original.
2. Adoptar el contrato en inglés ya implícito en el diseño de BD, con payload de request fijo (parámetros nombrados uno a uno).
3. Igual que (2) pero con un mapa genérico de features en el request, y bucketing de riesgo calculado en el API en vez de confiado al modelo.

## Decisión

Se adopta la opción 3.

**Request** `POST /predict`:
```json
{
  "studentId": "uuid",
  "contractVersion": "1",
  "features": {
    "promedio_general": 8.1,
    "materias_reprobadas": 2,
    "creditos_cursados": 45
  }
}
```
`features` es un mapa genérico `Record<string, string | number | boolean | null>`. El API construye ese mapa desde los datos núcleo + `extra_data` del estudiante mediante una función aislada (`buildPredictionPayload`), sin que el shape del payload dependa de qué columnas existan hoy.

**Response** `POST /predict`:
```json
{
  "modelVersion": "mock-v0",
  "score": 0.87,
  "riskLevel": "high",
  "topFactors": [{ "feature": "materias_reprobadas", "contribution": 0.41 }]
}
```
- `score` (0-1) es el único campo obligatorio de verdad además de `modelVersion`.
- `riskLevel` es opcional en la respuesta del modelo: si el modelo no lo manda, el API lo calcula a partir de `score` usando un umbral configurable en `SystemConfig`, en vez de confiar ciegamente en el bucketing que decida el modelo.
- `topFactors` es opcional/nullable — el mock puede omitirlo u devolver valores simulados; no todo modelo tendrá explicabilidad lista para el beta.
- El contrato **no incluye recomendaciones** — ver [ADR-0002](0002-recomendaciones-generadas-en-api.md).

Este schema se formaliza como Pydantic (`ml`) + DTO NestJS (`api`) en la Fase 4 del roadmap, y se entrega a las compañeras del usuario como la interfaz que su servicio debe implementar, no como algo a lo que el usuario se adapta después de que ellas entreguen su modelo.

## Consecuencias

- El API queda desacoplado de qué variables use el modelo final: cambiar variables es cambiar qué se incluye en `features`, no tocar código del API.
- El cálculo de `riskLevel` con umbral propio da control aunque el modelo de las compañeras solo entregue una probabilidad, o si su bucketing no coincide con lo que el sistema necesita mostrar.
- Cualquier cambio de forma real (campos nuevos obligatorios) se maneja incrementando `contractVersion`, no rompiendo el contrato existente.
- Cuando el modelo real llegue, el único punto de cambio esperado es dentro de `apps/ml` — el API y el frontend no deberían requerir cambios salvo que `contractVersion` suba.
