# ADR-0002: Recomendaciones de intervención generadas por reglas en el API

**Estado:** Aceptado — 2026-07-10
**Sustituye:** el supuesto implícito en `04-diseno-base-datos.md` §2/§3 de que `PredictionRecommendation` se llena a partir de lo que devuelve el servicio ML.

## Contexto

UC-09 requiere que cada predicción muestre recomendaciones de intervención (p. ej. "canalizar al tutor académico"). El diseño original modela `PredictionRecommendation` como entidad relacionada 0..N con `Prediction`, sin especificar de dónde salen esas recomendaciones en la práctica.

"Canalizar a tutoría" es una regla institucional/pedagógica, no una salida natural de un modelo de clasificación de riesgo (sklearn no sabe qué política de intervención usa el ITM). Depender de que el servicio ML las devuelva acopla el sistema a una decisión que las compañeras de ML probablemente no van a implementar, y bloquea la construcción/demo de esta funcionalidad hasta que el modelo real exista.

## Opciones consideradas

1. El servicio ML devuelve las recomendaciones como parte de la respuesta de `/predict`.
2. El API genera las recomendaciones aplicando una tabla de reglas propia, indexada por `riskLevel` (y opcionalmente `topFactors`), independiente de lo que devuelva el modelo.

## Decisión

Se adopta la opción 2. El contrato de `/predict` ([ADR-0001](0001-contrato-integracion-ml.md)) no incluye recomendaciones. El API mantiene una tabla de reglas (`riskLevel → recomendaciones[]`, configurable, con semilla inicial de 3 niveles) y las genera al momento de persistir cada `Prediction`.

Adicionalmente, `PredictionRecommendation` se simplifica de tabla relacional a un campo JSONB dentro de `Prediction` para el beta, porque las recomendaciones no son editables individualmente por el usuario ni se necesitan consultar de forma independiente todavía. Se promueve a tabla real solo si aparece una necesidad real de consultarlas/agregarlas por separado (p. ej. "cuántos estudiantes recibieron la recomendación X").

## Consecuencias

- Toda la funcionalidad de recomendaciones se puede construir y demostrar en el beta usando exclusivamente el mock de ML, sin esperar al modelo real de las compañeras.
- El sistema no depende de que el modelo entregue explicabilidad o texto de recomendación — solo necesita `riskLevel`/`score`.
- Si más adelante se requiere que las recomendaciones sean editables por rol o consultables de forma independiente, hay que migrar el campo JSONB a una tabla real (`PredictionRecommendation`) — cambio de v2, no bloqueante ahora.
