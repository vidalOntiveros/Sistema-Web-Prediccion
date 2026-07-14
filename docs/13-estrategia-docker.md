# Estrategia de Docker

Referencia: [10-estructura-monorepo.md](10-estructura-monorepo.md) §7 · [03-arquitectura.md](03-arquitectura.md) §8 · [CLAUDE.md](../CLAUDE.md) §8

## 1. Objetivo y alcance

Docker sirve para dos cosas en esta etapa, ninguna de las cuales es "loop de desarrollo diario" (esa regla ya quedó fijada en `CLAUDE.md` §8: Postgres siempre en Docker, `web`/`api`/`ml` nativos mientras se programa activamente):

1. **Checkpoint de integración periódico** — verificar que los 4 servicios arrancan juntos y se comunican, al cierre de cada fase del roadmap de beta.
2. **Entrega/demo del beta** — que cualquiera (el asesor, un futuro reclutador viendo el repo) pueda levantar el sistema completo con `docker-compose up` sin instalar Node/Python localmente.

Despliegue en la nube real queda fuera de alcance del beta (`docs/estado-proyecto.md`), aunque el diseño 12-factor ya deja la puerta abierta (`03-arquitectura.md` §8.2).

## 2. Dockerfiles por app

Todos multi-stage, para que la imagen final no cargue herramientas de build ni `devDependencies`.

**Imagen base: `node:22-slim` (Debian) en vez de `node:22-alpine`.** Decisión explícita, no la opción por defecto más pequeña: `argon2` (hash de contraseñas) tiene un módulo nativo que requiere compilarse contra la libc del sistema, y Prisma también ha tenido fricción histórica con los binary targets de Alpine (musl vs. glibc) — ambos son dolores de cabeza documentados y evitables. La imagen final es unos MB más grande; para un sistema que corre local/en un solo droplet, ese costo es irrelevante comparado con el tiempo perdido depurando un build de Alpine roto.

**`apps/api` (NestJS):**
1. `deps` — instala dependencias con pnpm (incluye devDependencies, necesarias para compilar).
2. `build` — corre `prisma generate` + `nest build`.
3. `runtime` — copia `dist/`, `node_modules` podado a solo producción (`pnpm prune --prod` o `pnpm install --prod` en esta etapa), `prisma/schema.prisma` (necesario en runtime para `prisma migrate deploy`), usuario no-root, `CMD ["node", "dist/main.js"]`.

**`apps/web` (Next.js):**
1. `deps` — instala dependencias.
2. `build` — `next build` con `output: 'standalone'` en `next.config.ts` (empaqueta solo lo necesario para correr, sin todo `node_modules`).
3. `runtime` — copia la salida `standalone` + `public/` + `.next/static`, usuario no-root, `CMD ["node", "server.js"]`.

**`apps/ml` (FastAPI):**
1. `python:3.12-slim` como única etapa razonable (no hay build step pesado sin el modelo real todavía) — instala `requirements.txt`, copia `app/`, usuario no-root, `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]`.

## 3. `docker-compose.yml` (base)

Servicios: `db`, `api`, `web`, `ml`. Un solo network por defecto (el que crea Compose automáticamente) — no se segmenta en redes separadas, no hay necesidad real a esta escala.

- **`depends_on` con `condition: service_healthy`**, no solo orden de arranque: `api` espera a que `db` tenga healthcheck verde (`pg_isready`) antes de intentar migrar/conectar; `web` espera a que `api` responda `/health`.
- **Healthchecks:** `db` → `pg_isready`; `api`/`ml` → `GET /health`; `web` → `GET /` con código `200`.
- **Volumen nombrado `pgdata`** para la base de datos — `docker-compose down` no borra los datos; solo `docker-compose down -v` lo hace explícitamente.
- **Variables de entorno:** Compose lee el `.env` de la raíz automáticamente (`10-estructura-monorepo.md` §4).

## 4. Exposición de puertos al host

| Servicio | Puerto publicado al host (compose base) | Motivo |
|---|---|---|
| `web` | `3001:3000` | es la puerta de entrada para el usuario/navegador |
| `api` | `3000:3000` | necesario para que `web` (BFF) y para debugging/Swagger (`/api/docs`) |
| `db` | *(no publicado en base; sí en override para debugging con un cliente SQL local)* | sin necesidad de exponerlo para que el sistema funcione |
| `ml` | *(no publicado en base)* | consistente con "no expuesto a internet" (`03-arquitectura.md` §7) — solo alcanzable desde `api` dentro de la red interna de Compose, incluso en local |

## 5. `docker-compose.override.yml` (dev / checkpoint de integración)

Se aplica automáticamente en local (Compose lo mezcla con el base si existe). Su propósito, dado que el loop diario es nativo, es que el checkpoint de integración sea rápido de repetir sin reconstruir imágenes desde cero cada vez:

- Monta el código fuente como volumen sobre la imagen de cada servicio y usa el comando de desarrollo en vez del de producción (`pnpm start:dev` para `api`, `next dev` para `web`, `uvicorn --reload` para `ml`) — así, si se detecta un problema durante el checkpoint, se corrige y se vuelve a probar sin un rebuild completo de la imagen.
- Publica `ml` al host (`8000:8000`) **solo en este archivo de desarrollo**, por conveniencia de abrir su Swagger (`/docs`) directo desde el navegador del host mientras se itera el mock — no contradice el principio de "no expuesto a internet" porque sigue siendo `localhost` de la máquina de desarrollo, no una red pública.
- Publica `db` al host (`5432:5432`) para poder conectarse con un cliente SQL (TablePlus, DBeaver, la extensión de VS Code) mientras se depura.

## 6. Docker en CI

CI (`.github/workflows/ci.yml`, ver `12-estrategia-testing.md` §8) agrega un paso `docker build` por cada `Dockerfile` (sin `docker-compose up` del stack completo) — atrapa un Dockerfile roto (dependencia faltante, `COPY` de una ruta que ya no existe) en cada PR, con costo mínimo de tiempo de CI, sin la complejidad de levantar los 4 servicios como *services* de GitHub Actions.

## 7. Fuera de alcance en beta

- **Reverse proxy (nginx/Traefik):** ya marcado opcional en `03-arquitectura.md` §9 — se agrega el día que haya más de un servicio compitiendo por el puerto 80/443 públicamente, no antes.
- **Despliegue real en un proveedor cloud:** el diseño 12-factor lo deja preparado, pero ejecutarlo es v2/post-beta.
- **Imágenes multi-arquitectura (arm64/amd64) o publicadas a un registry:** innecesario mientras el único consumidor de las imágenes es la misma máquina donde se construyen.

## 8. Estado: congelado — 2026-07-10

1. **`node:22-slim` (§2)** — aprobado.
2. **Puertos de `ml`/`db` expuestos solo en `docker-compose.override.yml` (§5)** — aprobado.

Con esto, los 8 documentos de diseño técnico quedan completos y congelados. El siguiente paso es la Fase 1 del roadmap (`docs/estado-proyecto.md`): inicializar el monorepo según lo definido en el documento 5.
