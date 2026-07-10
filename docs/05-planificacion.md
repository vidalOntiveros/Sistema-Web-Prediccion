# Planificación

Referencia: [01-requerimientos.md](01-requerimientos.md), [03-arquitectura.md](03-arquitectura.md)

## 1. Contexto y objetivo del cronograma

- Fecha de inicio efectivo: **10 de julio de 2026**.
- Fecha límite institucional: **diciembre de 2026** (≈5 meses de calendario de residencias).
- Objetivo personal: **terminar lo antes posible** (idealmente en 3 meses, dejando septiembre-diciembre como colchón para documentación, defensa y ajustes), ya que el propósito es incorporarse cuanto antes al mercado laboral como desarrollador.
- Metodología: **Kanban con sprints de 1 semana**, priorizando siempre tener un incremento funcional de punta a punta (frontend → backend → BD, y luego integración ML) antes de sumar features adicionales, para reducir el riesgo de "todo a medias" cerca de la fecha límite.

## 2. Fases

| Fase | Contenido | Duración estimada acelerada | Entregable |
|---|---|---|---|
| **0. Análisis** | Requerimientos, casos de uso, arquitectura, diseño de BD (este conjunto de documentos) | 1 semana (10–17 jul 2026) | `docs/01-04` ✅ |
| **1. Setup e infraestructura base** | Monorepo (pnpm workspaces), scaffolding de `web`/`api`/`ml`, Docker Compose local, CI básico (lint/build) | 1 semana | Repos corriendo con "hello world" end-to-end en Docker |
| **2. Backend core: Auth + RBAC + Usuarios** | Módulo Auth (JWT), entidades User/Role/Permission, guards de permisos, CRUD de usuarios y roles | 1.5 semanas | UC-01, UC-02, UC-03 funcionales con pruebas |
| **3. Estudiantes + Datasets** | CRUD de estudiantes, catálogo de columnas dinámico, carga y validación de CSV/Excel, asignación docente-estudiante | 2 semanas | UC-04, UC-05, UC-12 funcionales |
| **4. Servicio ML + integración de predicciones** | API FastAPI con modelo (inicialmente uno base/placeholder si el dataset definitivo no ha llegado), endpoint `/predict`, integración desde `api`, historial de predicciones y recomendaciones | 2 semanas | UC-06, UC-07, UC-09 funcionales |
| **5. Frontend completo** | Dashboards por rol, formularios, tablas con filtros, carga de archivos, visualización de predicciones | 2 semanas (en paralelo parcial con fases 3-4) | UI completa conectada a la API |
| **6. Estadísticas, reportes y configuración** | Dashboards agregados, exportación CSV/PDF, pantalla de configuración de parámetros/columnas | 1.5 semanas | UC-08, UC-10, UC-11 |
| **7. Pruebas, hardening y documentación técnica** | Pruebas unitarias/integración clave, revisión de seguridad, documentación técnica del sistema, manual de despliegue | 1.5 semanas | Documentación técnica + suite de pruebas mínima viable |
| **8. Documento de residencia + presentación final** | Redacción del documento de residencia profesional y preparación de la defensa | 1.5–2 semanas | Documento + presentación |

**Total acelerado estimado: ~13-14 semanas (~3.2 meses)**, con margen para imprevistos (dataset definitivo tardío, cambios de alcance) antes de la fecha límite de diciembre.

## 3. Cronograma tentativo (calendario)

| Semana | Fechas | Fase |
|---|---|---|
| 1 | 10–17 jul 2026 | Fase 0 — Análisis (cierre) |
| 2 | 18–24 jul 2026 | Fase 1 — Setup e infraestructura |
| 3–4 | 25 jul – 7 ago 2026 | Fase 2 — Auth + RBAC + Usuarios |
| 5–6 | 8–21 ago 2026 | Fase 3 — Estudiantes + Datasets |
| 6–7 | 15–28 ago 2026 | Fase 5 — Frontend (en paralelo, arranca a mitad de fase 3) |
| 7–8 | 22 ago – 4 sep 2026 | Fase 4 — Servicio ML + integración |
| 9 | 5–11 sep 2026 | Fase 6 — Estadísticas/reportes/configuración |
| 10 | 12–18 sep 2026 | Fase 7 — Pruebas y documentación técnica |
| 11–12 | 19 sep – 2 oct 2026 | Fase 8 — Documento de residencia + presentación |
| — | oct–dic 2026 | Colchón: ajustes por dataset real del ITM, retroalimentación del asesor, defensa formal |

> Estas fechas son una meta de ritmo personal, no un compromiso institucional. Se revisan y ajustan al final de cada fase (retro semanal ligera).

## 4. Riesgos y mitigación

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El dataset definitivo del ITM llega tarde o difiere de la estructura esperada | Alto | Arquitectura de esquema flexible (catálogo + JSONB, ver [04-diseno-base-datos.md](04-diseno-base-datos.md)) permite absorber el cambio sin retrabajo estructural; se usa un dataset sintético/de referencia mientras tanto para no bloquear el desarrollo. |
| Cambios en roles/permisos solicitados por la institución | Medio | RBAC dirigido por datos (sin roles hardcodeados) absorbe cambios sin tocar código. |
| Subestimación de tiempo por ser el primer proyecto full-stack de esta escala | Medio | Cronograma acelerado deja colchón de ~2 meses antes de la fecha límite institucional. |
| Falta de un modelo de ML entrenado/etiquetas de calidad | Medio | Fase 4 puede iniciar con un modelo simple/placeholder (p. ej. regresión logística con reglas conocidas) y reemplazarlo después sin afectar al backend, gracias al desacoplamiento del servicio ML. |
| Disponibilidad de tiempo real limitada por otras materias/actividades de residencia | Medio | Priorización estricta por fase; siempre mantener un sistema end-to-end funcional en vez de features incompletas en paralelo. |

## 5. Entregables finales (recordatorio del formato de entrega)

- Sistema web completamente funcional.
- Código fuente documentado.
- Base de datos (con script de migraciones/seed).
- Documentación técnica del sistema (arquitectura, BD, manual de despliegue).
- Documento de residencia profesional.
- Presentación final para la defensa del proyecto.
