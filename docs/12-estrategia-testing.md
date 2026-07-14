# Estrategia de testing

Referencia: [07-diseno-modulos-nestjs.md](07-diseno-modulos-nestjs.md) · [08-diseno-frontend.md](08-diseno-frontend.md) · [09-contrato-ml-definitivo.md](09-contrato-ml-definitivo.md) · [estado-proyecto.md](estado-proyecto.md)

## 1. Filosofía

Sin gate de cobertura por porcentaje (nada de "80% o falla el CI"). Perseguir un número de cobertura genérico produce pruebas de bajo valor (getters triviales, componentes que solo renderizan). En su lugar, el criterio es una **lista explícita de rutas críticas que deben estar probadas** (§6) — eso es lo que se revisa antes de dar por cerrada cada fase del roadmap de beta, no un porcentaje.

## 2. Stack por app

| App | Framework de test | Notas |
|---|---|---|
| `apps/api` | Jest (+ `@nestjs/testing`) | mismo runner para unit e integración |
| `apps/web` | Jest + React Testing Library | uso deliberadamente acotado (§5) |
| `apps/ml` | pytest | + `httpx`/`TestClient` de FastAPI |

Se usa Jest en `web` en vez de Vitest para que todo el monorepo de Node comparta un solo runner/configuración — reduce la carga de aprender dos herramientas de testing distintas para un beneficio marginal (Vitest es más rápido, pero la suite del frontend es intencionalmente pequeña en beta).

## 3. Pirámide de pruebas por app

### `apps/api`
- **Unit (`*.spec.ts`, co-ubicados junto al archivo que prueban):** funciones y métodos de servicio con lógica real y sin dependencia de infraestructura — `buildPredictionPayload`, cálculo de `riskLevel` desde `score` + umbral, resolución de recomendaciones por regla, validación de `extraData` contra el catálogo. `PrismaService` se mockea aquí porque lo que se prueba es la lógica, no la query.
- **Integración/E2E (`test/*.e2e-spec.ts`, arrancan el `AppModule` completo de Nest vía `@nestjs/testing`):** golpean una base de datos de pruebas real (§4) a través de Prisma — porque el filtrado por scope (`:all`/`:own`) y la validación de dataset son exactamente el tipo de lógica que un mock de Prisma puede "confirmar" sin que sea cierto (el mock solo devuelve lo que asumiste que la query iba a devolver). El `MlClientService` se reemplaza por un stub inyectado (§5), nunca se llama al servicio ML real ni al mock de `apps/ml` durante estos tests.

### `apps/web`
- Sin pruebas de componentes de UI de forma exhaustiva en beta — la superficie cambia rápido en esta fase y el retorno de invertir en tests de render es bajo comparado con QA manual en navegador (ver regla general del proyecto sobre validar cambios de UI en el navegador).
- Sí se prueban con Jest las piezas de **lógica pura sin DOM**: `useHasPermission`, los schemas de validación zod (`lib/validation/`), y el mapeo de `riskLevel` a color en `RiskBadge` si esa lógica crece más allá de un `switch` trivial.

### `apps/ml`
- pytest sobre `predict.py`: dado un conjunto de `features` conocido, el score cae en el rango esperado y es monótono respecto a `materias_reprobadas`/`adeudos` (más reprobadas → score igual o mayor). Prueba también el caso de `features` incompletas (debe usar el valor neutro por defecto, no fallar).
- pytest sobre `auth.py`: request sin `X-Internal-Api-Key` o con valor incorrecto → `401`.
- pytest sobre `models.py`: un payload que no cumple `PredictionRequest` (falta `studentId` o `contractVersion`) → `422` de FastAPI/Pydantic.

## 4. Base de datos de pruebas

Una base de datos Postgres efímera dedicada a pruebas (`prediccion_test`, mismo motor que dev, dentro del mismo contenedor `db` de Docker Compose o uno separado `db-test` — se decide en el documento 8 de Docker). Antes de correr la suite de integración: `prisma migrate deploy` + seed mínimo de fixtures (roles/permisos, 2-3 estudiantes, catálogo de columnas). Cada archivo de test que escribe datos limpia lo que creó (transacción revertida o `truncate` dirigido), no se depende de un estado global acumulado entre archivos de test.

## 5. Mocking del servicio ML en tests de `apps/api`

Los tests de integración de `PredictionsModule` **no** levantan `apps/ml` — reemplazan `MlClientService` por un stub inyectado vía el sistema de DI de Nest (`overrideProvider` en el módulo de testing), con casos controlados por test: respuesta exitosa, respuesta con `INSUFFICIENT_DATA`, timeout/`502`. Esto es más rápido que un servicio HTTP real y permite provocar el caso de error sin depender de que el mock de `apps/ml` tenga ese comportamiento implementado.

## 6. Checklist de pruebas críticas para el beta (consolidado por fase)

- [ ] Login: credenciales válidas/inválidas, cuenta desactivada, rate limit de intentos
- [ ] `PermissionsGuard`: acceso permitido/denegado según permisos del token
- [ ] Resolución de scope `:all` vs `:own` en `students` y `predictions` (incluyendo el caso 404 por fuera de alcance)
- [ ] CRUD de usuarios: no se puede uno mismo desactivar, email duplicado → 409
- [ ] Validación de `extraData` contra catálogo (tipo incorrecto, campo requerido faltante)
- [ ] Carga de dataset: archivo válido crea/actualiza; archivo con errores no aplica cambios parciales (todo o nada)
- [ ] Asignación/desasignación de docente-estudiante
- [ ] Flujo de predicción completo con `MlClientService` stub: éxito, datos insuficientes, servicio no disponible
- [ ] Cálculo de `riskLevel` desde `score` cuando el ML no lo manda
- [ ] Generación de recomendaciones por regla según `riskLevel`
- [ ] Historial de predicciones filtrado por alcance del usuario
- [ ] `apps/ml`: fórmula del mock, autenticación por API key, validación Pydantic

## 7. Lo que NO se prueba automáticamente en beta (y por qué)

- **E2E de navegador real (Playwright/Cypress) contra el stack completo** — valioso, pero cuesta tiempo de setup y mantenimiento que no se justifica para un beta de 4-6 semanas de un solo desarrollador. Se sustituye por el smoke test manual ya definido en `docs/estado-proyecto.md` (Fase 5: "Smoke test manual completo de `docker-compose up` end-to-end"). Candidato a v2 si el sistema crece.
- **Tests de componentes de UI exhaustivos** — ver §3.
- **Tests de carga/rendimiento** (RNF-08, miles de registros) — se verifica manualmente con un dataset sintético grande una vez, no de forma continua en CI.

## 8. Integración continua (CI)

En cada push/PR (`.github/workflows/ci.yml`):
1. `apps/api`: lint + typecheck + `jest` (unit) + `jest --config e2e` (integración, contra la base de datos de pruebas levantada como *service* de GitHub Actions).
2. `apps/web`: lint + typecheck + `jest` (el conjunto acotado de §3).
3. `apps/ml`: `ruff`/`black --check` + `pytest`.

No se levanta el `docker-compose` completo (los 4 servicios) dentro de CI en beta — el costo de configurarlo ahí no se justifica todavía frente al smoke test manual (§7). Se reconsidera si el equipo crece o si aparecen regresiones de integración recurrentes que las pruebas actuales no detectan.

## 9. Estado: congelado — 2026-07-10

1. **Jest en `apps/web`, mismo runner que `apps/api` (§2)** — aprobado.
2. **Sin tests de componentes de UI en beta (§3, §7)** — aprobado.

Siguiente documento: [13-estrategia-docker.md](13-estrategia-docker.md) — estrategia de Docker.
