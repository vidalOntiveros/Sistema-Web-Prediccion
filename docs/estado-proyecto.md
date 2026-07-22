# Estado del proyecto

Referencia: [01-requerimientos.md](01-requerimientos.md) · [03-arquitectura.md](03-arquitectura.md) · [05-planificacion.md](05-planificacion.md) · [adr/](adr/)

> Este documento es la fuente de verdad de "en qué fase estamos". Se actualiza al cierre de cada sprint/fase. `05-planificacion.md` documenta el plan original de v1 completo; este documento define el recorte real hacia un beta y sustituye su cronograma de ritmo (seguimiento de [ADR-0003](adr/0003-alcance-beta-agosto.md)).

## 1. Fecha de referencia

- Hoy: **2026-07-22**.
- Fecha objetivo de beta: **primera semana de agosto de 2026 (supuesto — confirmar fecha real de inicio de residencias formales)**.
- Fecha límite institucional (v1 completo): diciembre de 2026.

## 2. Fase actual

**Fase 0 — Análisis:** ✅ completa (`docs/01-04`) + revisión crítica del 2026-07-10 (este documento y los ADR en `docs/adr/`).
**Fase 0.5 — Diseño técnico:** ✅ completa (2026-07-10). Ocho documentos, todos congelados, cada decisión de arquitectura relevante confirmada antes de implementar:

| Doc | Contenido |
|---|---|
| [06-diseno-api-rest.md](06-diseno-api-rest.md) | Contrato HTTP completo: endpoints, permisos, paginación, errores |
| [07-diseno-modulos-nestjs.md](07-diseno-modulos-nestjs.md) | Módulos de `apps/api`, guards, scoping `:all`/`:own`, cliente ML |
| [08-diseno-frontend.md](08-diseno-frontend.md) | Patrón BFF con cookie httpOnly, TanStack Query, pantallas por rol |
| [09-contrato-ml-definitivo.md](09-contrato-ml-definitivo.md) | Contrato Pydantic definitivo, auth interna, lógica del mock |
| [10-estructura-monorepo.md](10-estructura-monorepo.md) | Árbol de archivos, pnpm workspace, env vars, tooling |
| [11-convenciones-proyecto.md](11-convenciones-proyecto.md) | Idioma, nomenclatura, commits, ramas, logs, comentarios |
| [12-estrategia-testing.md](12-estrategia-testing.md) | Stack de tests, pirámide por app, checklist de rutas críticas |
| [13-estrategia-docker.md](13-estrategia-docker.md) | Dockerfiles, compose base vs. override, puertos expuestos |

**Fase 1 — Setup e infraestructura:** ✅ completa (2026-07-15) — checkpoint de Docker y primera migración contra Postgres real verificados.
**Fase 3 — Estudiantes + Dataset:** ✅ completa (2026-07-18).
**Fase 4 — Integración de predicciones:** ✅ completa (2026-07-22) — backend + frontend verificados end-to-end en navegador (login → crear estudiante → ejecutar predicción → historial → detalle).

## 3. Roadmap de beta (orden de ejecución)

### Fase 1 — Esqueleto caminante (~1 semana)
- [x] Monorepo pnpm workspaces (`apps/web`, `apps/api`, `apps/ml`)
- [x] Tooling raíz: `.gitignore`, `.env.example`, README stub, `.editorconfig`, `.nvmrc`, `tsconfig.base.json`, `.prettierrc`
- [x] Scaffold `apps/api` (NestJS) con health check (`GET /health`, prefijo `/api/v1` en el resto)
- [x] Scaffold `apps/web` (Next.js + TS + Tailwind + shadcn init)
- [x] Scaffold `apps/ml` (FastAPI) con health check **y mock de `/predict` ya cumpliendo el contrato de [ADR-0001](adr/0001-contrato-integracion-ml.md)** (adelantado desde fase 4 original) — con 9 tests de pytest cubriendo la fórmula determinista, auth por API key y el contrato
- [x] `docker-compose.yml` + `docker-compose.override.yml` + Dockerfiles según [13-estrategia-docker.md](13-estrategia-docker.md) — **escritos y con YAML validado, pero sin verificar con un `docker-compose up` real** (ver bloqueo abajo)
- [x] Checkpoint: `docker-compose up` levanta los 4 servicios y responden entre sí — verificado (2026-07-15): `db`/`api`/`ml`/`web` en estado `healthy`, login + `/auth/me` probados end-to-end a través de los 4 contenedores
- [x] Schema completo de Prisma escrito (`apps/api/prisma/schema.prisma`, con la simplificación JSONB de [ADR-0002](adr/0002-recomendaciones-generadas-en-api.md) ya aplicada) y cliente generado — se adelantó el schema completo de la Fase 2 en vez de dejar una migración vacía, porque el diseño ya estaba congelado y no había razón para hacerlo en dos pasos
- [x] Primera migración real contra Postgres (`20260715095914_init`, 2026-07-15) + seed corrido contra la BD real
- [x] CI básico (lint + build) — `.github/workflows/ci.yml`, verificado localmente (lint/build/test de `api` y `web`, lint/test de `ml`); el job de `docker build` corre en el runner de GitHub Actions (que sí trae Docker), no depende de esta máquina

**Desviaciones registradas frente al diseño original:**
- Prisma 7 (instalada por ser la versión vigente) cambió su forma de configurarse: la URL de conexión ya no vive en `schema.prisma`, ahora vive en `prisma.config.ts`, y `PrismaClient` requiere un *driver adapter* (`@prisma/adapter-pg`) en vez de leer `DATABASE_URL` directamente. `docs/07-diseno-modulos-nestjs.md` no preveía este detalle porque es un cambio de la herramienta, no de nuestra arquitectura — el `PrismaService` ya está escrito con el adapter.
- Desarrollo nativo usa Python 3.11 (instalado en la máquina) en vez de 3.12 como decía `01-requerimientos.md` — la imagen Docker de `apps/ml` sí usa `python:3.12-slim` como estaba diseñado. Diferencia de bajo riesgo, no bloquea nada.
- `apps/web` usa `zod@3.25.x` en vez de `zod@4` (la versión "actual" al momento de instalar) — `@hookform/resolvers@5.4.0` (última versión publicada) todavía no tiene los tipos de `zodResolver` compatibles con zod 4.4.x (falla el type-check, no el runtime). Se documenta como algo a revisar si `@hookform/resolvers` publica una versión que corrija el overload de tipos.
- **Bug real corregido (2026-07-15):** `GET /health` respondía `401 Unauthorized` porque el `JwtAuthGuard` global (`APP_GUARD`) lo protegía igual que cualquier otra ruta — nadie lo notó antes porque nunca se había probado contra un healthcheck real de Docker. Se agregó `@Public()` en `AppController.getHealth` (`apps/api/src/app.controller.ts`), mismo patrón que `/auth/login`.
- El seed de Prisma (`apps/api/prisma/seed.ts`) corre con `tsx` en vez de `ts-node` — con `moduleResolution: nodenext` (`apps/api/tsconfig.json`), el cliente de Prisma generado usa imports relativos con extensión `.js` que apuntan a archivos `.ts` fuente; `ts-node` en modo CJS no resuelve esa convención al ejecutar un script suelto (mismo tipo de problema que ya obligó a un `moduleNameMapper` en Jest), `tsx` sí. Cambio en `apps/api/prisma.config.ts` (`seed: "tsx prisma/seed.ts"`) + `tsx` como devDependency de `apps/api`.

### Fase 2 — Auth + RBAC + Usuarios (~1.5 semanas) — 🟡 falta solo pantalla de administración de usuarios (2026-07-18)
- [x] Schema Prisma: User/Role/Permission/UserRole/RolePermission (adelantado en Fase 1) + **seed** (`prisma/seed.ts`: 19 permisos, 3 roles, matriz de `02-casos-uso.md` §4, usuario Admin inicial)
- [x] Módulo Auth: hash argon2, login, JWT access-only ([ADR-0004](adr/0004-sesion-jwt-sin-revocacion.md)), rate limit 5/15min por IP+email (`LoginThrottlerGuard`)
- [x] `PermissionsGuard` genérico + `@RequirePermission` + `JwtAuthGuard` global + `@Public`/`@CurrentUser`
- [x] Logout (solo cliente, sin invalidación server-side en beta) + auditado
- [x] `AuditLog`: helper reusable (`AuditService.record`) + registro en login éxito/fallo/logout/mutaciones de usuario
- [x] CRUD de usuarios (Admin), sin borrado físico — solo `isActive`; incluye `reset-password` y `PATCH /:id/role`
- [x] `RolesModule` de solo lectura (`GET /roles`, `GET /permissions`)
- [x] Filtro global de errores (sobre único de `06-diseno-api-rest.md` §3) + `ValidationPipe` + Swagger en `/api/docs`
- [x] Frontend: login, contexto de auth (`AuthContext`/`use-auth`/`useHasPermission`), rutas protegidas (`proxy.ts`, ex-`middleware.ts`), BFF (`api-client.ts` + Route Handlers), `AppShell`/layout real en `(app)/layout.tsx` — verificado end-to-end (curl y navegador) contra `apps/api` nativo + Postgres en Docker
- [ ] Frontend: pantalla de administración de usuarios (asignar rol existente, no crear roles nuevos)
- [x] Tests: guard de permisos (4) + flujo de login (4, con Prisma/UsersService mockeados) — 9/9 pasan
- [ ] Tests de integración reales (`test/*.e2e-spec.ts` contra Postgres) — bloqueados por lo mismo que el checkpoint de Fase 1 (sin Docker todavía)

**Notas técnicas de esta fase:**
- Prisma 7 genera el cliente con salida ESM por defecto, incompatible con Jest/CommonJS — se fijó `moduleFormat = "cjs"` en el generador y se agregó `moduleNameMapper` en la config de Jest para resolver imports con extensión `.js` (patrón NodeNext) a los `.ts` fuente. Sin esto, cualquier test que tocara `PrismaService` fallaba con `SyntaxError: Cannot use 'import.meta' outside a module`.
- `AuditLog.userId` se volvió opcional (`String?`) — un login fallido con un correo que no existe no tiene usuario al cual asociarlo, y el schema original (heredado de `04-diseno-base-datos.md`) lo exigía obligatorio.
- Permisos embebidos en el JWT al login, tal como se decidió en `07-diseno-modulos-nestjs.md` §9 — un cambio de rol no aplica hasta que la persona vuelva a iniciar sesión.

### Fase 3 — Estudiantes + Dataset (~2 semanas) — ✅ completa (2026-07-18)
- [x] Schema Prisma: Student/TeacherStudent/DatasetColumnDefinition/DatasetUpload (adelantado en Fase 1) + seed de catálogo por defecto (`edad`, `sexo`, `promedio_general`, `materias_reprobadas`, `creditos_acumulados`, `adeudos` — referencia de `01-requerimientos.md` §6, a reemplazar en Fase 6 con el dataset real del ITM)
- [x] CRUD de estudiantes + filtros (carrera/semestre/número de control/docente) — `StudentsModule`/`DatasetColumnsModule`, `validateExtraData` compartida (`src/common/validate-extra-data.ts`), `StudentScopeService` para `:all`/`:own` (docs/07-diseno-modulos-nestjs.md §5). Verificado manualmente end-to-end (crear con/sin errores de validación, filtros, asignar/quitar docente, scope `:own` con 404 fuera de alcance) — 2026-07-15.
- [x] Endpoint de carga: parseo CSV/XLSX (`parsers/csv.parser.ts`, `parsers/xlsx.parser.ts`), validación de columnas núcleo + `extraData` contra catálogo activo, commit atómico **síncrono** dentro de `prisma.$transaction` (todo o nada). `DatasetUploadsModule`. Se agregaron campos a `DatasetUpload` que faltaban en el schema original (`createdCount`, `updatedCount`, `errors` — migración `20260717165745_add_dataset_upload_result_fields`) para poder cumplir la respuesta que ya prometía `06-diseno-api-rest.md` §5.6. Verificado manualmente end-to-end (CSV válido crea, mismo CSV re-subido actualiza, CSV con errores no aplica nada y responde 422 con `{row,field,issue}` exacto, XLSX real generado con SheetJS, tipo de archivo no soportado → 400) — 2026-07-17.
- [x] Endpoint de historial de cargas (`GET /dataset-uploads`, `GET /dataset-uploads/:id` con reporte de errores si `status=failed`, sin revert en beta) — incluido en `DatasetUploadsModule`
- [x] Endpoint de asignación docente-estudiante (`POST/DELETE /students/:id/teachers`, incluido en `StudentsModule`)
- [x] Frontend: listado con filtros (`student-table.tsx`), formulario de estudiante con campos dinámicos desde catálogo (`student-form.tsx`, `dynamic-field.tsx`), carga con preview y reporte de errores fila/columna (`dataset-uploads/new`), historial de cargas (`dataset-uploads`, `dataset-uploads/[id]`) — typecheck y lint limpios en `apps/web`; falta verificación manual end-to-end en navegador
- [x] Tests: `validateExtraData` (tipo incorrecto, campo requerido faltante, coerción) + `StudentScopeService` (`:all` vs `:own`) + `validateCoreFields` (núcleo faltante/inválido) + parser de CSV (BOM, trim, numeración de fila) — 24/24 pasan en total

### Fase 4 — Integración de predicciones (~1.5 semanas) — ✅ completa (2026-07-22)
- [x] Lado Pydantic del contrato `/predict` (`apps/ml/app/models.py`, adelantado en Fase 1 junto con el mock)
- [x] `buildPredictionPayload(student)` como módulo aislado (`apps/api/src/predictions/build-prediction-payload.ts`) — mapa genérico `career`/`semester` + `extraData` completo, sin depender de qué columnas exista hoy el catálogo
- [x] `MlClientService` (`apps/api/src/predictions/ml-client.service.ts`) — `fetch` nativo de Node (sin dependencia nueva tipo `@nestjs/axios`), timeout de 8s vía `AbortController`, mapea 422→`INSUFFICIENT_STUDENT_DATA` y caída/timeout→`502 ML_SERVICE_UNAVAILABLE`
- [x] Endpoint `POST /predictions` → llama ML → calcula `riskLevel` si falta (umbral en `SystemConfig`, clave `prediction_risk_thresholds`, default `{medium:0.4,high:0.7}`, seed agregado) → persiste `Prediction`
- [x] Tabla de reglas de recomendaciones en API, indexadas por `riskLevel` (`apps/api/src/predictions/recommendation-rules.ts`, [ADR-0002](adr/0002-recomendaciones-generadas-en-api.md))
- [x] Endpoint de historial de predicciones con filtros (`GET /predictions` — `studentId`/`career`/`riskLevel`/`dateFrom`/`dateTo`, `GET /predictions/:id`), scoping `:all`/`:own` reutilizando `StudentScopeService` (ya exportado desde `StudentsModule`) tal como preveía `07-diseno-modulos-nestjs.md` §5
- [x] Frontend: acción "ejecutar predicción" en detalle de estudiante (`RunPredictionButton`), vista de resultado + recomendaciones (`PredictionResultCard`, reutilizada en detalle de estudiante y en `/predictions/:id`), historial con filtros (`/predictions`, `PredictionTable`) — link "Ver historial" desde el estudiante, link "Predicciones" en la nav
- [x] Tests unitarios: `buildPredictionPayload` (4), `MlClientService` (5, con `fetch` mockeado), `PredictionsService` (4, con Prisma/scope/ML mockeados) — 13/13 pasan, 37/37 en total del proyecto
- [x] Checkpoint manual end-to-end en navegador (2026-07-22): Docker (Postgres) + `api`/`ml` nativos + `web` nativo, login como Admin → crear estudiante con datos de riesgo → "Ejecutar predicción" → resultado con `riskLevel=high`, factores y recomendaciones → historial (`/predictions?studentId=...`) → detalle de predicción. Sin errores de consola relevantes (el único `401` es el chequeo de sesión esperado antes de login).
- [ ] Tests de integración e2e automatizados (`test/*.e2e-spec.ts` contra Postgres) — mismo bloqueo que Fase 1/2, pendiente de automatizar lo ya verificado manualmente

### Fase 5 — Dashboard y cierre de beta (~1 semana)
- [ ] Endpoint de dashboard: conteos agregados (sin series de tiempo)
- [ ] Frontend: dashboard por rol
- [ ] Pantalla de solo-lectura de auditoría (Admin)
- [ ] Swagger en `api` y `ml`
- [ ] README de instalación/arquitectura, apto para portafolio
- [ ] Smoke test manual completo de `docker-compose up` end-to-end

**→ Checkpoint de beta.** Si la ventana real hasta agosto es más corta de ~5.5-6 semanas, el primer recorte es la Fase 5 completa y simplificar Fase 3 (menos filtros, validación más simple).

### Fase 6 — Post-beta (septiembre–diciembre, v2)
- [ ] Reemplazar internals del mock por el modelo real (solo toca `apps/ml` + contrato si cambia)
- [ ] Ajustar seed del catálogo al dataset definitivo del ITM
- [ ] Exportación CSV → luego PDF
- [ ] Predicción por lote/grupo
- [ ] Estadísticas de tendencia en el tiempo
- [ ] UI de creación de roles/permisos custom
- [ ] UI de edición del catálogo de columnas
- [ ] Refresh token real con revocación
- [ ] Ampliar cobertura de tests, probar carga con volumen real
- [ ] Documento de residencia + presentación final

## 4. Bloqueos abiertos

- Fecha exacta de inicio de residencias formales (afecta cuánto se puede recortar la Fase 5).
- Estructura final del dataset del ITM (no bloquea desarrollo — se usa catálogo de referencia mientras tanto).
- Variables reales que usará el modelo de ML de las compañeras.

## 5. Decisiones pendientes (usuario / profesor / compañeras)

- Forma final del dataset del ITM (columnas, tipos).
- Si el modelo de las compañeras hace su propio preprocesamiento (encoding/escalado) o espera features crudos del API.
- Formato exacto de entrega institucional (¿solo código+demo, o documento con formato específico del ITM?).
- Si "eliminar usuario" (RF-06) debe ser borrado físico o basta con desactivar (recomendación vigente: desactivar).
- Política institucional de manejo de datos de estudiantes reales (privacidad) para lo que se publique en portafolio.
- Si se distingue asignación docente-estudiante por materia (afecta si se agrega campo `subject` a `TeacherStudent`).

## 6. Supuestos temporales activos

- Beta objetivo: primera semana de agosto de 2026.
- Catálogo de columnas del dataset: el listado de referencia de `01-requerimientos.md` §6.
- Contrato `/predict` = el definido en [ADR-0001](adr/0001-contrato-integracion-ml.md).
- Un usuario = un rol para la UI de beta (el modelo de datos ya soporta N:N a futuro).
- Sin borrado físico de usuarios/estudiantes en v1 — todo por `is_active`/`status`.
- Recomendaciones generadas por reglas propias en el API, no por el modelo de ML.
- `TeacherStudent` sin distinción por materia en beta (una sola asignación por par docente-estudiante).
- Encabezados núcleo esperados en CSV/XLSX de carga masiva: `numero_control`, `nombre`, `carrera`, `semestre` (snake_case sin acentos, igual que las claves del catálogo `extraData`) — ninguna fuente lo especifica todavía porque no existe el dataset real del ITM; ajustar en `apps/api/src/dataset-uploads/validate-core-fields.ts` (`CORE_FIELD`) cuando se defina el formato real.
- Límite de filas por carga (`dataset_upload_row_limit` en `SystemConfig`, default 2000) y tamaño máximo de archivo (5 MB, hardcoded en `DatasetUploadsService`) — el CRUD completo de `/system-config` (§5.10 de `06-diseno-api-rest.md`) no está implementado todavía, solo se lee esta clave directo por Prisma.

## 7. Hallazgos de la revisión crítica (2026-07-10) — no resueltos en docs/01-04 todavía

- `05-planificacion.md` §2-3 fue escrito para "terminar todo lo antes posible en ~3 meses", no para un beta antes de agosto — este documento lo sustituye en cuanto a ritmo/orden.
- `PredictionRecommendation` en `04-diseno-base-datos.md` §2/§4 se simplifica a JSONB dentro de `Prediction` para beta (ver §8 de `CLAUDE.md`).
- Falta estrategia de sesión/logout explícita frente a RF-04 — resuelto para beta en [ADR-0004](adr/0004-sesion-jwt-sin-revocacion.md).
- `TeacherStudent` en `04-diseno-base-datos.md` no modela "por materia" mencionado en `02-casos-uso.md` UC-12 — decisión pendiente (§5 arriba), supuesto temporal: sin distinción en beta.
- Faltan índices en `AuditLog.userId` / `AuditLog.createdAt` en `04-diseno-base-datos.md` §5 — agregar en la migración inicial de Fase 2.
- El contrato de ejemplo original (`probabilidad`/`riesgo`/`recomendacion`) queda obsoleto — usar el de [ADR-0001](adr/0001-contrato-integracion-ml.md).
