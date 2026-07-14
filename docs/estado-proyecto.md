# Estado del proyecto

Referencia: [01-requerimientos.md](01-requerimientos.md) · [03-arquitectura.md](03-arquitectura.md) · [05-planificacion.md](05-planificacion.md) · [adr/](adr/)

> Este documento es la fuente de verdad de "en qué fase estamos". Se actualiza al cierre de cada sprint/fase. `05-planificacion.md` documenta el plan original de v1 completo; este documento define el recorte real hacia un beta y sustituye su cronograma de ritmo (seguimiento de [ADR-0003](adr/0003-alcance-beta-agosto.md)).

## 1. Fecha de referencia

- Hoy: **2026-07-10**.
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

**Fase 1 — Setup e infraestructura:** 🟡 en progreso (2026-07-14) — todo lo que no depende de Docker está hecho; falta el checkpoint real y la primera migración contra una BD real.

## 3. Roadmap de beta (orden de ejecución)

### Fase 1 — Esqueleto caminante (~1 semana)
- [x] Monorepo pnpm workspaces (`apps/web`, `apps/api`, `apps/ml`)
- [x] Tooling raíz: `.gitignore`, `.env.example`, README stub, `.editorconfig`, `.nvmrc`, `tsconfig.base.json`, `.prettierrc`
- [x] Scaffold `apps/api` (NestJS) con health check (`GET /health`, prefijo `/api/v1` en el resto)
- [x] Scaffold `apps/web` (Next.js + TS + Tailwind + shadcn init)
- [x] Scaffold `apps/ml` (FastAPI) con health check **y mock de `/predict` ya cumpliendo el contrato de [ADR-0001](adr/0001-contrato-integracion-ml.md)** (adelantado desde fase 4 original) — con 9 tests de pytest cubriendo la fórmula determinista, auth por API key y el contrato
- [x] `docker-compose.yml` + `docker-compose.override.yml` + Dockerfiles según [13-estrategia-docker.md](13-estrategia-docker.md) — **escritos y con YAML validado, pero sin verificar con un `docker-compose up` real** (ver bloqueo abajo)
- [ ] Checkpoint: `docker-compose up` levanta los 4 servicios y responden entre sí — **bloqueado: Docker Desktop no estaba instalado en la máquina de desarrollo: pendiente de que el usuario lo instale**
- [x] Schema completo de Prisma escrito (`apps/api/prisma/schema.prisma`, con la simplificación JSONB de [ADR-0002](adr/0002-recomendaciones-generadas-en-api.md) ya aplicada) y cliente generado — se adelantó el schema completo de la Fase 2 en vez de dejar una migración vacía, porque el diseño ya estaba congelado y no había razón para hacerlo en dos pasos
- [ ] Primera migración real contra Postgres — **bloqueada por lo mismo que el checkpoint de Docker**; `prisma generate` sí corre limpio (no requiere conexión)
- [x] CI básico (lint + build) — `.github/workflows/ci.yml`, verificado localmente (lint/build/test de `api` y `web`, lint/test de `ml`); el job de `docker build` corre en el runner de GitHub Actions (que sí trae Docker), no depende de esta máquina

**Desviaciones registradas frente al diseño original:**
- Prisma 7 (instalada por ser la versión vigente) cambió su forma de configurarse: la URL de conexión ya no vive en `schema.prisma`, ahora vive en `prisma.config.ts`, y `PrismaClient` requiere un *driver adapter* (`@prisma/adapter-pg`) en vez de leer `DATABASE_URL` directamente. `docs/07-diseno-modulos-nestjs.md` no preveía este detalle porque es un cambio de la herramienta, no de nuestra arquitectura — el `PrismaService` ya está escrito con el adapter.
- Desarrollo nativo usa Python 3.11 (instalado en la máquina) en vez de 3.12 como decía `01-requerimientos.md` — la imagen Docker de `apps/ml` sí usa `python:3.12-slim` como estaba diseñado. Diferencia de bajo riesgo, no bloquea nada.

### Fase 2 — Auth + RBAC + Usuarios (~1.5 semanas) — 🟡 backend hecho, frontend pendiente (2026-07-14)
- [x] Schema Prisma: User/Role/Permission/UserRole/RolePermission (adelantado en Fase 1) + **seed** (`prisma/seed.ts`: 19 permisos, 3 roles, matriz de `02-casos-uso.md` §4, usuario Admin inicial)
- [x] Módulo Auth: hash argon2, login, JWT access-only ([ADR-0004](adr/0004-sesion-jwt-sin-revocacion.md)), rate limit 5/15min por IP+email (`LoginThrottlerGuard`)
- [x] `PermissionsGuard` genérico + `@RequirePermission` + `JwtAuthGuard` global + `@Public`/`@CurrentUser`
- [x] Logout (solo cliente, sin invalidación server-side en beta) + auditado
- [x] `AuditLog`: helper reusable (`AuditService.record`) + registro en login éxito/fallo/logout/mutaciones de usuario
- [x] CRUD de usuarios (Admin), sin borrado físico — solo `isActive`; incluye `reset-password` y `PATCH /:id/role`
- [x] `RolesModule` de solo lectura (`GET /roles`, `GET /permissions`)
- [x] Filtro global de errores (sobre único de `06-diseno-api-rest.md` §3) + `ValidationPipe` + Swagger en `/api/docs`
- [ ] Frontend: login, contexto de auth, rutas protegidas, shell por rol
- [ ] Frontend: pantalla de administración de usuarios (asignar rol existente, no crear roles nuevos)
- [x] Tests: guard de permisos (4) + flujo de login (4, con Prisma/UsersService mockeados) — 9/9 pasan
- [ ] Tests de integración reales (`test/*.e2e-spec.ts` contra Postgres) — bloqueados por lo mismo que el checkpoint de Fase 1 (sin Docker todavía)

**Notas técnicas de esta fase:**
- Prisma 7 genera el cliente con salida ESM por defecto, incompatible con Jest/CommonJS — se fijó `moduleFormat = "cjs"` en el generador y se agregó `moduleNameMapper` en la config de Jest para resolver imports con extensión `.js` (patrón NodeNext) a los `.ts` fuente. Sin esto, cualquier test que tocara `PrismaService` fallaba con `SyntaxError: Cannot use 'import.meta' outside a module`.
- `AuditLog.userId` se volvió opcional (`String?`) — un login fallido con un correo que no existe no tiene usuario al cual asociarlo, y el schema original (heredado de `04-diseno-base-datos.md`) lo exigía obligatorio.
- Permisos embebidos en el JWT al login, tal como se decidió en `07-diseno-modulos-nestjs.md` §9 — un cambio de rol no aplica hasta que la persona vuelva a iniciar sesión.

### Fase 3 — Estudiantes + Dataset (~2 semanas)
- [x] Schema Prisma: Student/TeacherStudent/DatasetColumnDefinition/DatasetUpload (adelantado en Fase 1) — falta el **seed** de catálogo por defecto
- [ ] CRUD de estudiantes + filtros (carrera/semestre/número de control/docente)
- [ ] Endpoint de carga: parseo CSV/XLSX, validación contra catálogo activo, commit atómico **síncrono** (sin cola async en beta)
- [ ] Endpoint de historial de cargas (sin revert en beta)
- [ ] Endpoint de asignación docente-estudiante (desde el registro del estudiante, sin pantalla de asignación masiva)
- [ ] Frontend: listado con filtros, formulario de estudiante (campos dinámicos desde catálogo), carga con preview y reporte de errores, historial de cargas
- [ ] Tests: casos borde de validación CSV

### Fase 4 — Integración de predicciones (~1.5 semanas)
- [x] Lado Pydantic del contrato `/predict` (`apps/ml/app/models.py`, adelantado en Fase 1 junto con el mock) — falta el DTO espejo en NestJS, que se escribe junto con el endpoint `POST /predictions`
- [ ] `buildPredictionPayload(student)` como módulo aislado
- [ ] Endpoint `POST /predictions` → llama ML → persiste `Prediction`
- [ ] Tabla de reglas de recomendaciones en API, indexadas por `riskLevel` ([ADR-0002](adr/0002-recomendaciones-generadas-en-api.md))
- [ ] Endpoint de historial de predicciones con filtros
- [ ] Frontend: acción "ejecutar predicción" en detalle de estudiante (individual, no por lote), vista de resultado + recomendaciones, historial
- [ ] Tests: flujo de predicción con mock, scoping por docente (solo asignados)

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

## 7. Hallazgos de la revisión crítica (2026-07-10) — no resueltos en docs/01-04 todavía

- `05-planificacion.md` §2-3 fue escrito para "terminar todo lo antes posible en ~3 meses", no para un beta antes de agosto — este documento lo sustituye en cuanto a ritmo/orden.
- `PredictionRecommendation` en `04-diseno-base-datos.md` §2/§4 se simplifica a JSONB dentro de `Prediction` para beta (ver §8 de `CLAUDE.md`).
- Falta estrategia de sesión/logout explícita frente a RF-04 — resuelto para beta en [ADR-0004](adr/0004-sesion-jwt-sin-revocacion.md).
- `TeacherStudent` en `04-diseno-base-datos.md` no modela "por materia" mencionado en `02-casos-uso.md` UC-12 — decisión pendiente (§5 arriba), supuesto temporal: sin distinción en beta.
- Faltan índices en `AuditLog.userId` / `AuditLog.createdAt` en `04-diseno-base-datos.md` §5 — agregar en la migración inicial de Fase 2.
- El contrato de ejemplo original (`probabilidad`/`riesgo`/`recomendacion`) queda obsoleto — usar el de [ADR-0001](adr/0001-contrato-integracion-ml.md).
