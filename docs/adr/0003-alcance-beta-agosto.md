# ADR-0003: Alcance de la versión Beta (agosto 2026) vs. sistema v1 completo

**Estado:** Aceptado — 2026-07-10
**Sustituye:** el ritmo y las fases de `05-planificacion.md` §2-3 en lo que respecta a los próximos ~4-6 semanas; no sustituye los requerimientos ni casos de uso, solo su secuencia y su corte de "qué entra ahora".

## Contexto

`01-requerimientos.md` documenta 30 requerimientos funcionales + 10 no funcionales: un sistema institucional completo, razonable como meta de diciembre de 2026. `05-planificacion.md` fue escrito con el objetivo de "terminar todo lo antes posible en ~3 meses", pero su propio cronograma no cierra la integración de ML hasta principios de septiembre.

El objetivo real actual del usuario es distinto: llegar al inicio de residencias formales (supuesto: primera semana de agosto de 2026) con un **beta funcional, bien estructurado y fácilmente adaptable** — no el sistema completo. El dataset definitivo y el modelo de ML todavía no existen y los define un equipo externo (compañeras + profesor), así que el desarrollo no debe bloquearse esperándolos.

## Opciones consideradas

1. Seguir el cronograma de `05-planificacion.md` tal cual, aceptando que en agosto el sistema estará a la mitad.
2. Comprimir las mismas fases sin recortar alcance (mismo scope, menos tiempo por fase).
3. Definir explícitamente un corte de alcance de beta — un subconjunto reducido y coherente del sistema — y mover el resto a una fase post-beta (septiembre-diciembre).

## Decisión

Se adopta la opción 3. El detalle línea por línea vive en `docs/estado-proyecto.md` (roadmap de beta) — este ADR fija el principio y la lista de exclusiones deliberadas.

**Queda fuera del beta (movido a Fase 6 / v2):**
- Exportación PDF (solo CSV en beta).
- Predicción por lote/grupo (solo individual).
- Revertir/descartar una carga de dataset ya confirmada.
- UI para crear roles/permisos custom (beta: solo asignar un rol ya sembrado a un usuario).
- UI para editar el catálogo de columnas del dataset (beta: catálogo sembrado por script).
- Estadísticas de tendencia en el tiempo (beta: solo conteos agregados puntuales).
- Refresh token con rotación y revocación real (ver [ADR-0004](0004-sesion-jwt-sin-revocacion.md)).
- Procesamiento asíncrono/por cola de cargas de dataset (beta: síncrono, con límite de filas).
- Borrado físico de usuarios/estudiantes (beta: solo desactivación).
- Asignación docente-estudiante distinguida por materia.

**Se mantiene igual de riguroso en beta (no se recorta):**
- RBAC dirigido por datos (guard genérico, no roles hardcodeados).
- Esquema flexible de estudiantes (catálogo + JSONB).
- El contrato `/predict` versionado ([ADR-0001](0001-contrato-integracion-ml.md)).
- Seguridad mínima: hash argon2/bcrypt, rate limiting en login, CORS explícito.
- Auditoría de acciones sensibles (aunque con vista simple de solo lectura).

## Consecuencias

- El sistema entregado en agosto no cubre los 30 RF de `01-requerimientos.md` — cubre el subconjunto listado como "MUST" en `docs/estado-proyecto.md`. Esto debe quedar claro en cualquier presentación o demo del beta para no generar expectativas de sistema terminado.
- Las partes recortadas no requieren rediseño para agregarse después: los puntos que se mantienen rigurosos (RBAC por datos, catálogo+JSONB, contrato ML versionado) son justamente los que hacen que agregar lo recortado en Fase 6 sea una extensión y no una reescritura.
- `05-planificacion.md` queda como documento histórico del análisis original; `docs/estado-proyecto.md` es la referencia operativa vigente para secuencia y ritmo.
