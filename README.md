# Sistema Web de Predicción de Deserción Estudiantil

Sistema web para predicción de riesgo de deserción estudiantil — Instituto Tecnológico de Mazatlán, residencias profesionales.

> README completo (instalación, arquitectura, manual de uso) pendiente para el cierre del beta — ver `docs/estado-proyecto.md` Fase 5.

## Estructura

- `apps/web` — Next.js (frontend)
- `apps/api` — NestJS + Prisma (backend)
- `apps/ml` — FastAPI (servicio de predicción)
- `docs/` — análisis, diseño técnico y ADRs del proyecto

## Documentación

Empieza por [`CLAUDE.md`](CLAUDE.md) y [`docs/estado-proyecto.md`](docs/estado-proyecto.md) para el contexto y el estado actual del proyecto.

## Requisitos

- Node 22 LTS, pnpm
- Python 3.12 (Docker) / 3.11 usado en desarrollo nativo por ahora
- Docker + Docker Compose (para levantar el stack completo)

## Desarrollo

```bash
cp .env.example .env
pnpm install
pnpm dev        # levanta web + api en paralelo (nativo)
```

`apps/ml` se corre por separado (ver su propio README).
