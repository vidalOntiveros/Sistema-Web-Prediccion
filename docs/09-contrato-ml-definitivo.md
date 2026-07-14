# Contrato definitivo Backend ↔ Servicio ML (`apps/ml`)

Referencia: [ADR-0001](adr/0001-contrato-integracion-ml.md) · [ADR-0002](adr/0002-recomendaciones-generadas-en-api.md) · [07-diseno-modulos-nestjs.md](07-diseno-modulos-nestjs.md) §6

> ADR-0001 fijó la forma del payload. Este documento formaliza el contrato completo — endpoints, autenticación interna, reglas de validación, comportamiento exacto del mock y proceso de versionado — al nivel de detalle necesario para implementar `apps/ml` sin ambigüedad y para entregárselo como especificación a las compañeras que construyen el modelo real.

## 1. Endpoints de `apps/ml`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/health` | ninguna | usado por el healthcheck de Docker Compose y por monitoreo básico |
| POST | `/predict` | API key interna (§2) | endpoint principal, contrato de ADR-0001 |
| GET | `/docs` | ninguna (solo red interna) | Swagger/OpenAPI autogenerado por FastAPI a partir de los modelos Pydantic — es el documento vivo que se le entrega a las compañeras |

No hay más endpoints en beta. `apps/ml` no expone nada de lectura de datos ni de configuración — es una función pura request→response.

## 2. Autenticación interna (API ↔ ML)

`apps/ml` **no se expone a internet** (`03-arquitectura.md` §6-7) — solo es alcanzable dentro de la red de Docker Compose. Aun así, se exige una API key interna simple para que un contenedor mal configurado en la misma red no pueda invocarlo por accidente:

- Header `X-Internal-Api-Key: <valor>`, comparado contra la variable de entorno `ML_INTERNAL_API_KEY` (la misma en `apps/api` y `apps/ml`, inyectada por `.env`).
- Si falta o no coincide → `401`, cuerpo `{ "detail": "invalid_api_key" }`.
- No es JWT ni OAuth — es deliberadamente simple porque el perímetro real de seguridad es la red privada de Docker, no este header.

## 3. Modelos de datos (Pydantic, especificación)

**`PredictionRequest`**
| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `studentId` | `str` (uuid) | sí | solo para trazabilidad en logs de `apps/ml`; el servicio ML no consulta la BD con esto |
| `contractVersion` | `str` | sí | `"1"` en beta |
| `features` | `dict[str, str \| float \| bool \| None]` | sí | mapa abierto — `apps/ml` decide qué claves usa y cuáles ignora |

**`PredictionResponse`**
| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `modelVersion` | `str` | sí | constante del servicio (`"mock-v0"` en beta), no del request |
| `score` | `float` (0-1) | sí | único campo que el API trata como fuente de verdad |
| `riskLevel` | `"low" \| "medium" \| "high"` | no | opcional — si se omite, `apps/api` lo calcula desde `score` con el umbral de `SystemConfig` |
| `topFactors` | `list[{feature: str, contribution: float}]` | no | opcional, puede ir vacío |

**Respuesta de error de datos insuficientes** (ver §4): `PredictionErrorResponse`
| Campo | Tipo |
|---|---|
| `error` | `"INSUFFICIENT_DATA"` |
| `message` | `str` |
| `missingFeatures` | `list[str]` |

## 4. Quién decide "datos insuficientes"

`apps/api` **no** valida de antemano qué claves de `features` son suficientes — no le corresponde, porque el conjunto de variables relevantes lo define el modelo, no el backend (ver riesgo señalado en la revisión crítica: la lógica de qué es "suficiente" vive donde vive el conocimiento del modelo). En cambio:

1. `apps/api` arma `features` con todo lo disponible del estudiante (columnas núcleo + `extraData` completo) y llama a `/predict`.
2. `apps/ml` es quien sabe qué claves son realmente necesarias para su modelo (o su mock). Si faltan claves críticas o son `null`, responde `422` con `PredictionErrorResponse`.
3. `apps/api` mapea ese `422` de `apps/ml` directamente a su propio `422 INSUFFICIENT_STUDENT_DATA` (documento 1, §5.7) usando `missingFeatures` como `details`.

Esto mantiene al backend "tonto" respecto a qué variables importan — ese conocimiento vive enteramente en `apps/ml`, que es justo el servicio que las compañeras van a modificar.

## 5. Comportamiento del mock (beta)

El mock no devuelve valores aleatorios puros — usa una fórmula determinista simple sobre un subconjunto conocido de `features` (los del catálogo de referencia de `01-requerimientos.md` §6), para que una demo se vea coherente (mismo estudiante → mismo resultado; estudiantes con peor desempeño → score más alto) sin que eso implique que ya hay un modelo real:

```
score_base = 0.5
  - 0.05 * (promedio_general - 7.0)      # promedio más alto que 7 baja el score
  + 0.08 * materias_reprobadas            # cada materia reprobada sube el score
  + 0.03 * adeudos                        # cada adeudo sube el score
score = clamp(score_base, 0.02, 0.98)
riskLevel = "high" si score >= umbral_alto, "medium" si >= umbral_medio, si no "low"
           (el mock puede omitir riskLevel y dejar que apps/api lo calcule — recomendado, para ejercitar ese camino desde ya)
topFactors = las 2-3 features con mayor peso absoluto en la fórmula, con su contribución normalizada
```

Si `promedio_general`, `materias_reprobadas` o `adeudos` no vienen en `features` (porque el catálogo del ITM final no las incluye igual), el mock usa un valor por defecto neutro para esa variable en vez de fallar — el mock debe ser tolerante a variaciones del catálogo por definición, ya que existe justo para no bloquear el desarrollo mientras el dataset cambia.

**Reemplazo futuro:** cuando exista el modelo real, todo este bloque de `apps/ml` (el cuerpo del handler de `/predict`) se sustituye por la llamada real al pipeline entrenado (sklearn/joblib, etc.). El contrato HTTP (§3) no cambia salvo que el modelo real necesite una versión de contrato distinta (§6). `modelVersion` deja de ser `"mock-v0"` y pasa a identificar la versión real del modelo entrenado (p. ej. `"logreg-v1-2026-09"`).

## 6. Versionado del contrato

- `contractVersion` viaja en cada request; en beta solo existe `"1"`.
- Si en el futuro se necesita un cambio incompatible (nuevo campo obligatorio, cambio de tipo), se sube a `"2"` y se actualiza este documento + ADR-0001 en el mismo cambio que toca `apps/api` y `apps/ml` juntos.
- No se construye infraestructura de "soportar N versiones simultáneas" — dado que `apps/api` y `apps/ml` los mantiene el mismo equipo pequeño (el usuario + compañeras), un cambio de contrato se coordina como un solo cambio atómico en ambos servicios, no como una migración gradual con capas de compatibilidad. Sobre-construir eso sería la sobreingeniería que el resto de este proceso ha estado evitando.

## 7. Qué se entrega a las compañeras de ML

1. Este documento + ADR-0001.
2. El Swagger de `apps/ml` (`/docs`) una vez que exista el mock — como especificación ejecutable, no solo en prosa.
3. La regla explícita: **su implementación real de `/predict` debe cumplir el mismo contrato de request/response** (§3) que cumple el mock. Pueden cambiar completamente qué hay dentro del handler (su pipeline, sus librerías, su lógica de features), pero no la forma del contrato sin coordinarlo como un cambio de versión (§6).
4. Se les pide confirmar, en cuanto tengan claridad, la lista de `features` que su modelo realmente necesita — esa lista informa qué columnas del catálogo (`DatasetColumnDefinition`) deben marcarse `required` y cuáles son opcionales, pero **no cambia el contrato HTTP en sí** (`features` sigue siendo un mapa abierto).

## 8. Estado: congelado — 2026-07-10

1. **Fórmula determinista del mock (§5)** — aprobada tal cual.
2. **API key interna simple (§2)** — aprobada tal cual.

Siguiente documento: [10-estructura-monorepo.md](10-estructura-monorepo.md) — estructura completa del monorepo.
