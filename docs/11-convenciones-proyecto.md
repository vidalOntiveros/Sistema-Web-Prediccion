# Convenciones del proyecto

Referencia: [10-estructura-monorepo.md](10-estructura-monorepo.md) · [CLAUDE.md](../CLAUDE.md) §14

> Reglas de estilo y proceso que aplican a todo el código del monorepo, para que no se decidan de nuevo (o de forma distinta) en cada módulo.

## 1. Idioma

- **Código (identificadores, DTOs, nombres de tabla/columna, claves de permiso, mensajes de log técnico):** inglés. Es la convención internacional y ya es lo que se ha usado en todos los documentos de diseño (`riskLevel`, `controlNumber`, `students:write`).
- **Texto orientado al usuario final** (labels de UI, mensajes de error mostrados en pantalla, contenido de reportes exportados): español — los usuarios del sistema son personal del ITM.
- **Commits, nombres de rama, comentarios de código:** inglés — mejora la lectura del historial como evidencia de portafolio para reclutadores (objetivo explícito del proyecto, `CLAUDE.md` §16).
- **Documentación del proyecto** (`docs/*.md`, ADRs, el propio `CLAUDE.md`): español — es lo que se usa para el informe de residencia y la comunicación con el asesor.

## 2. Nomenclatura de archivos y símbolos

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivos TS (Nest/Next no-componente) | kebab-case | `student.service.ts`, `create-student.dto.ts` |
| Componentes React | PascalCase | `StudentTable.tsx` |
| Hooks de React | camelCase, prefijo `use` | `useStudents.ts` |
| Clases (servicios, controllers, DTOs) | PascalCase | `StudentsService`, `CreateStudentDto` |
| Interfaces/Types | PascalCase, sin prefijo `I` | `AuthenticatedUser` (no `IAuthenticatedUser`) |
| Variables y funciones | camelCase | `buildPredictionPayload` |
| Constantes y variables de entorno | UPPER_SNAKE_CASE | `ML_INTERNAL_API_KEY` |
| Rutas de API | kebab-case, plural | `/dataset-uploads` |
| Claves de permiso | `recurso:accion[:alcance]` | `students:read:own` |
| Archivos Python | snake_case | `predict.py` |
| Clases Python | PascalCase | `PredictionRequest` |
| Funciones/variables Python | snake_case | `build_features` |

## 3. Nomenclatura de base de datos

Prisma usa camelCase en el schema (`riskLevel`, `controlNumber`) **sin** `@map`/`@@map` — las columnas y tablas reales en PostgreSQL quedan también en camelCase (entre comillas dobles, como genera Prisma por defecto). Alternativa descartada: usar `@map`/`@@map` para que la base de datos física use `snake_case` (más idiomático en PostgreSQL puro) — se descarta porque añade una anotación repetida en cada campo del schema sin cambiar ningún comportamiento observable; el único consumidor de la base de datos es Prisma, nunca SQL escrito a mano fuera de migraciones generadas.

## 4. Fechas y zonas horarias

- Todo timestamp se almacena en UTC (comportamiento por defecto de `DateTime` en Prisma/PostgreSQL `timestamptz`).
- La API siempre devuelve fechas en ISO 8601 UTC (`2026-08-01T10:00:00Z`).
- El formateo a la zona horaria y locale del usuario (`es-MX`, `America/Mazatlan`) ocurre **solo en el frontend**, nunca en el backend ni en la base de datos.

## 5. Conventional Commits

Formato: `tipo(scope): descripción breve en inglés, imperativo`.

| Tipo | Uso |
|---|---|
| `feat` | funcionalidad nueva |
| `fix` | corrección de bug |
| `refactor` | cambio de estructura sin cambiar comportamiento |
| `docs` | cambios en `docs/`, ADRs, README |
| `test` | agregar/ajustar pruebas |
| `chore` | tareas de mantenimiento (deps, config) |
| `style` | formato, sin cambio de lógica |
| `perf` | mejora de rendimiento |
| `ci` | pipelines de integración continua |
| `build` | Docker, empaquetado |

`scope` es el módulo de dominio cuando el cambio es específico (`feat(students): add teacher assignment endpoint`), o el nombre de la app cuando es transversal (`chore(web): add TanStack Query provider`, `build(docker): add ml service healthcheck`).

## 6. Ramas y Pull Requests

- Una rama por feature/tarea del roadmap, desde `main`: `feature/<slug>` (p. ej. `feature/students-crud`), `fix/<slug>` para correcciones.
- Sin rama `develop` — ceremonia innecesaria para un solo desarrollador; se integra directo a `main` vía PR.
- Cada PR, aunque se apruebe uno mismo, lleva descripción con: resumen del cambio, qué documento de diseño lo respalda (link a `docs/0X-...md` o ADR), y checklist de prueba manual/automatizada. Esto es la evidencia de proceso para el informe de residencia (`01-requerimientos.md` restricciones, `CLAUDE.md` §14).

## 7. Logs

- Logs estructurados a stdout (formato JSON), nunca a archivo local — consistente con 12-factor (`03-arquitectura.md` §5).
- Niveles: `error` (fallo que requiere atención), `warn` (situación anómala pero manejada, p. ej. ML respondió lento), `info` (eventos de negocio relevantes: login, carga de dataset completada), `debug` (solo en desarrollo).
- Nunca se loguea contraseña (ni hash), token JWT completo, ni el contenido completo de `extraData` de un estudiante (evitar volcar PII a logs). Se loguea el `id` del recurso, no su contenido.

## 8. Comentarios en código

Sin comentarios por defecto. Se agrega un comentario únicamente cuando explica un **porqué** no obvio (una restricción oculta, un workaround a un bug específico, una decisión que sorprendería a quien lea el código después) — nunca para describir qué hace el código cuando el nombre de la función/variable ya lo dice. Si un comentario solo repite el nombre de la función en prosa, no se escribe.

## 9. Estado: congelado — 2026-07-10

1. **Mezcla de idioma (§1)** — aprobada tal cual.
2. **Sin `@map`/`@@map` en Prisma (§3)** — aprobado tal cual.

Siguiente documento: [12-estrategia-testing.md](12-estrategia-testing.md) — estrategia de testing.
