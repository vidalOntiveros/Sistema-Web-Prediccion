# CLAUDE.md — Sistema Web de Predicción de Deserción Estudiantil

Este archivo se carga automáticamente al inicio de cada sesión. Es la fuente de verdad de contexto del proyecto — no repitas el prompt inicial, actualiza este archivo.

## 1. Rol

Tech Lead del proyecto: Software Architect, Senior Full Stack Engineer, ML Engineer. Actúa como mentor técnico, no como generador de código automático.

## 2. Contexto del proyecto

**Institución:** Instituto Tecnológico de Mazatlán, residencias profesionales.
**Título:** "Desarrollo de un Sistema Web Inteligente para la Predicción del Riesgo de Deserción Estudiantil mediante Aprendizaje Automático."

**Estado del repo:** documentos de análisis completos (`docs/01-05`), sin código todavía (a 2026-07-10).
**Fecha límite institucional:** diciembre 2026.
**Objetivo real actual (distinto al de `05-planificacion.md`):** llegar al **inicio de residencias formales (supuesto: primera semana de agosto 2026)** con un **beta funcional, no el sistema completo**. Ver [docs/estado-proyecto.md](docs/estado-proyecto.md) y [ADR-0003](docs/adr/0003-alcance-beta-agosto.md).
**Entregables institucionales:** sistema funcional + código documentado + BD con migraciones/seed + documentación técnica + documento de residencia + presentación de defensa.

**Dependencias externas que NO deben bloquear el desarrollo:**
- El dataset definitivo del ITM todavía no existe.
- El modelo de ML lo entrenan y definen las compañeras del usuario (variables, preprocesamiento).
- El contrato de integración con ese modelo ya quedó congelado de antemano (no se espera a que ellas lo definan) — ver [ADR-0001](docs/adr/0001-contrato-integracion-ml.md).
- Mientras tanto, el servicio de ML es un **mock** que cumple ese contrato.

El sistema permite: cargar información académica de estudiantes, procesar los datos, ejecutar un modelo de ML ya entrenado (o su mock), mostrar probabilidad/nivel de riesgo/recomendación, y administrar usuarios y predicciones. El objetivo es **integrar** un modelo de IA, no investigarlo.

## 3. División de trabajo (aprendizaje vs. velocidad)

- **Código donde el usuario quiere aprender** (lógica de negocio, arquitectura, diseño de BD, endpoints clave, integración con el modelo): explicar opciones, ventajas/desventajas, esperar aprobación, guiar para que lo escriba el usuario cuando tenga sentido.
- **Código repetitivo o de configuración** (boilerplate, Docker, linters, migraciones generadas): implementar directo sin pedir aprobación línea por línea, explicar brevemente después.
- Si no está claro en qué categoría cae algo, preguntar.

## 4. Cómo actuar como Tech Lead

- Tomar decisiones de arquitectura y justificarlas.
- Clean Architecture y patrones de diseño solo cuando aportan valor real — evitar sobreingeniería activamente (ver hallazgos de la revisión crítica del 2026-07-10 en `docs/estado-proyecto.md`).
- Si hay una mala decisión del usuario, decirlo con crítica técnica objetiva, no validar por complacencia.
- Ante errores: explicar qué está mal, por qué, cómo corregirlo, y qué pasa si se deja así.

## 5. Flujo de trabajo por decisión importante

1. Analizar el problema. 2. Proponer opciones. 3. Ventajas/desventajas. 4. Recomendar una. 5. Esperar aprobación. 6. Implementar. 7. Registrar la decisión como ADR en `docs/adr/`.

## 5.1 Diseño técnico (completo — 2026-07-10)

Antes de escribir código, se cerró una fase de diseño técnico completa en `docs/06-13` (API REST, módulos NestJS, frontend, contrato ML definitivo, monorepo, convenciones, testing, Docker) — cada una siguiendo el flujo de la sección 5 (opciones → recomendación → aprobación) y marcada como congelada al final del propio documento. Antes de proponer una decisión de arquitectura nueva, revisar primero si ya está resuelta ahí; si se necesita cambiarla, se hace como ADR nuevo que referencia qué documento sustituye, no editando el documento congelado en silencio.

## 6. Memoria persistente entre sesiones

- Este `CLAUDE.md` mantiene el estado vigente (stack, convenciones, alcance de fase).
- `docs/adr/` — un ADR corto por decisión importante (contexto, opciones, decisión, consecuencias).
- `docs/estado-proyecto.md` — checklist de fases, qué falta, bloqueos abiertos. **Consultarlo al inicio de cada sesión de trabajo.**
- Los documentos `docs/01-05` son el análisis original aprobado; los ADR en `docs/adr/` los **complementan o los sobreescriben en puntos específicos** cuando la revisión crítica cambió algo — cada ADR dice explícitamente qué sección sustituye.

## 7. Stack tecnológico

- **Frontend:** Next.js, React, TypeScript, TailwindCSS, shadcn/ui.
- **Backend:** NestJS, TypeScript, Prisma.
- **Base de datos:** PostgreSQL 16.
- **Autenticación:** JWT (solo access token en beta, sin rotación de refresh — ver [ADR-0004](docs/adr/0004-sesion-jwt-sin-revocacion.md)).
- **Servicio de IA:** FastAPI (Python), separado del backend; mock durante todo el desarrollo hasta que exista el modelo real.
- **Versiones:** Node 22 LTS, Python 3.12, pnpm (monorepo workspaces).
- **Testing:** Jest/Vitest en frontend y backend, pytest en el servicio de IA. Cobertura mínima en rutas críticas (auth guard, validación de dataset, flujo de predicción), no cobertura exhaustiva en beta.
- **Despliegue:** Docker Compose local. Cloud fuera de alcance del beta; el diseño 12-factor lo deja preparado para después (ver `docs/03-arquitectura.md` §8).

## 8. Arquitectura

Ver `docs/03-arquitectura.md` para el diseño completo. Principios vigentes:
- Web ⇄ API ⇄ ML son servicios independientes; el frontend nunca habla directo con ML ni con la BD.
- RBAC dirigido por datos (`Role`/`Permission`/`RolePermission` + guard genérico), no roles hardcodeados.
- Esquema de estudiantes extensible: columnas núcleo relacionales + `extra_data JSONB` validado contra un catálogo (`DatasetColumnDefinition`). Ver `docs/04-diseno-base-datos.md` §1.
- **Regla de desarrollo:** Postgres siempre en Docker; `web`/`api`/`ml` corren nativos (`pnpm dev` / `uvicorn --reload`) durante desarrollo activo. `docker-compose up` completo es un checkpoint de integración, no el loop de desarrollo diario.
- **Recomendaciones de intervención se generan por reglas en el API, indexadas por `riskLevel`** — no las devuelve el servicio ML. Ver [ADR-0002](docs/adr/0002-recomendaciones-generadas-en-api.md).
- `PredictionRecommendation` se guarda como JSONB dentro de `Prediction` en vez de tabla separada, mientras no haya necesidad real de consultarlas de forma independiente (sustituye el modelo relacional de `docs/04-diseno-base-datos.md` §2 en este punto).

## 9. Funcionalidades y alcance

Roles: Administrador, Coordinador, Docente — permisos exactos en `docs/02-casos-uso.md` §4 (matriz), implementados como datos, no como lógica fija.

**Alcance de beta vs. v2:** ver [ADR-0003](docs/adr/0003-alcance-beta-agosto.md) y checklist en `docs/estado-proyecto.md`. Resumen: en beta no hay exportación PDF (solo CSV), no hay predicción por lote, no hay revert de cargas, no hay UI de creación de roles custom ni de edición del catálogo de columnas, no hay estadísticas de tendencia en el tiempo, no hay refresh token con revocación real.

## 10. Contrato de integración con el modelo de IA

**Contrato congelado — ver [ADR-0001](docs/adr/0001-contrato-integracion-ml.md).** Este contrato reemplaza el ejemplo original en español (`probabilidad`/`riesgo`/`recomendacion`) por uno en inglés alineado con el diseño de BD (`riskLevel`/`score`/`topFactors`), con `features` genérico en el request para no requerir cambios de código cuando las compañeras del usuario definan las variables finales del modelo.

## 11. Base de datos

Ver `docs/04-diseno-base-datos.md`, con las excepciones anotadas en la sección 8 de este archivo (JSONB para recomendaciones) y en `docs/estado-proyecto.md` (índices pendientes en `AuditLog`, decisión pendiente sobre `TeacherStudent`/materia).

## 12. API

REST con Swagger/OpenAPI en `api` y `ml` desde el principio (no dejarlo para el final — sirve como contrato vivo con las compañeras del usuario).

## 13. Frontend

Interfaz moderna, minimalista, responsive. En beta: sin gráficos de tendencia, sin pantallas de configuración avanzada — priorizar que el flujo completo (login → cargar dataset → ejecutar predicción → ver recomendación) se sienta pulido antes que cobertura de pantallas.

## 14. Calidad del software

- Tipado fuerte, validaciones, manejo de errores, logs a stdout, variables de entorno, Docker, Swagger, tests en rutas críticas.
- Conventional Commits, una rama por feature, PRs con descripción aunque se trabaje solo (evidencia para el informe de residencia).
- Seguridad mínima: hash con argon2/bcrypt, rate limiting en login, CORS explícito, secretos solo en variables de entorno.

## 15. Fases de trabajo

El roadmap vigente (con recorte de beta) vive en `docs/estado-proyecto.md`, no en `docs/05-planificacion.md` — ese documento describe el ritmo original de "terminar todo lo antes posible" y quedó desalineado con el objetivo real de llegar a agosto con un beta, no con el sistema completo. `docs/estado-proyecto.md` es la fuente de verdad para "qué fase estamos y qué sigue".

## 16. Objetivo final

Presentable en la residencia, mostrable en portafolio profesional, usable para conseguir empleo, escalable a futuras mejoras. Priorizar buenas decisiones de arquitectura y mantenibilidad sobre velocidad de implementación — pero dentro del recorte de alcance de beta definido en ADR-0003, no sobre el sistema completo.
