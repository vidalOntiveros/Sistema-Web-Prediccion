# Estructura del monorepo

Referencia: [03-arquitectura.md](03-arquitectura.md) §2, §9 · [06-09](06-diseno-api-rest.md)

> Este documento fija el árbol de archivos completo del repositorio y las decisiones de tooling que lo sostienen (workspaces, variables de entorno, TypeScript/lint compartido). La estrategia de Docker en sí (contenido de los Dockerfile/compose) es el documento 8 — aquí solo se fija dónde viven esos archivos.

## 1. Árbol completo

```
Sistema_Web_Prediccion/
├── apps/
│   ├── web/
│   │   ├── src/                    # ver 08-diseno-frontend.md §4
│   │   ├── public/
│   │   ├── package.json
│   │   ├── tsconfig.json           # extiende ../../tsconfig.base.json
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── .env.local              # gitignored — dev nativo
│   │   └── Dockerfile
│   ├── api/
│   │   ├── src/                    # ver 07-diseno-modulos-nestjs.md §2
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── test/                   # ver 11-estrategia-testing.md
│   │   ├── package.json
│   │   ├── tsconfig.json           # extiende ../../tsconfig.base.json
│   │   ├── .env.local              # gitignored — dev nativo
│   │   └── Dockerfile
│   └── ml/
│       ├── app/
│       │   ├── main.py             # entrypoint FastAPI
│       │   ├── models.py           # Pydantic: PredictionRequest/Response
│       │   ├── predict.py          # lógica del mock (09-contrato-ml-definitivo.md §5)
│       │   └── auth.py             # verificación de X-Internal-Api-Key
│       ├── tests/
│       ├── requirements.txt
│       ├── .env.local              # gitignored — dev nativo
│       └── Dockerfile
├── docs/
│   ├── 01-requerimientos.md … 05-planificacion.md
│   ├── 06-diseno-api-rest.md … 13-estrategia-docker.md
│   ├── estado-proyecto.md
│   └── adr/0001…000N
├── .github/
│   └── workflows/ci.yml
├── docker-compose.yml
├── docker-compose.override.yml     # dev: volúmenes/hot-reload (detalle en doc 8)
├── .env.example                    # única fuente de verdad de qué variables existen
├── .editorconfig
├── .gitignore
├── .nvmrc                          # 22
├── pnpm-workspace.yaml
├── package.json                    # scripts raíz + devDependencies compartidas
├── tsconfig.base.json              # compilerOptions estrictas, compartidas
├── eslint.config.js                # raíz, cada app lo extiende
├── .prettierrc
└── README.md
```

**No existe `packages/` todavía** — `shared-types` sigue explícitamente diferido (`03-arquitectura.md` §9, `08-diseno-frontend.md` §8). Se crea el día que el costo de mantener DTOs/schemas duplicados a mano supere el costo de montar el paquete — no antes.

## 2. Workspace de pnpm

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/web"
  - "apps/api"
```

`apps/ml` **no** entra al workspace de pnpm — es Python, no tiene `package.json`, y su gestión de dependencias es independiente (§6). Vive bajo `apps/` por consistencia conceptual (es una de las tres aplicaciones de la arquitectura), no porque pnpm lo orqueste.

## 3. Scripts raíz

`package.json` de la raíz concentra los atajos de desarrollo, delegando a cada workspace con `pnpm --filter`:

| Script | Efecto |
|---|---|
| `pnpm dev:web` | `pnpm --filter web dev` |
| `pnpm dev:api` | `pnpm --filter api start:dev` |
| `pnpm dev` | corre `dev:web` y `dev:api` en paralelo (via `concurrently`, dependencia de desarrollo en la raíz) — `apps/ml` se levanta aparte con su propio comando de Python porque no comparte el runner de Node |
| `pnpm build` | `pnpm --filter web build && pnpm --filter api build` |
| `pnpm lint` | `pnpm --filter web lint && pnpm --filter api lint` |
| `pnpm test` | `pnpm --filter web test && pnpm --filter api test` (`apps/ml` corre `pytest` por separado, ver doc 7 de testing) |

No se introduce Turborepo/Nx — con dos paquetes de Node y sin necesidad de cachear builds distribuidos, `pnpm --filter` es suficiente; un orquestador de monorepo añadiría configuración sin resolver un problema real todavía.

## 4. Variables de entorno

- **`.env.example`** en la raíz es la única fuente de verdad de qué variables existen en todo el sistema, documentadas con comentarios (incluyendo cuáles difieren entre Docker y ejecución nativa):
```
# Base de datos
DATABASE_URL=postgresql://user:pass@localhost:5432/prediccion   # localhost en nativo, "db" como host dentro de docker-compose

# Auth
JWT_SECRET=changeme
JWT_EXPIRES_IN=7200

# Servicio ML
ML_SERVICE_URL=http://localhost:8000      # http://ml:8000 dentro de docker-compose
ML_INTERNAL_API_KEY=changeme              # mismo valor en apps/api y apps/ml

# Next.js (BFF)
NEST_API_URL=http://localhost:3000
```
- **Docker Compose** lee un `.env` (gitignored, copiado de `.env.example`) en la raíz automáticamente.
- **Ejecución nativa** de `web`/`api`/`ml` durante desarrollo activo (regla ya fijada en `CLAUDE.md` §8: Postgres en Docker, resto nativo) usa el `.env.local` propio de cada app — mismo contenido conceptual que `.env.example`, pero con hostnames `localhost` en vez de nombres de servicio Docker. Evita el problema de "un solo `.env` no puede tener dos valores distintos para el mismo host según dónde corra".

## 5. TypeScript y lint compartidos

- `tsconfig.base.json` en la raíz fija `strict: true`, `noImplicitAny`, `noUncheckedIndexedAccess`, target moderno (ES2022) — cada `tsconfig.json` de `apps/web`/`apps/api` lo extiende y solo agrega lo específico de su framework (JSX para Next.js, `experimentalDecorators` para Nest).
- `eslint.config.js` raíz con reglas base de TypeScript; `apps/web` extiende con el plugin de Next/React, `apps/api` con el de Nest.
- `.prettierrc` único para todo el repo (sin overrides por app) — formato es formato, no hay razón para que difiera entre frontend y backend.

## 6. Gestión de dependencias de Python (`apps/ml`)

`requirements.txt` + `venv` estándar — sin Poetry/PDM. Es la opción de menor fricción para un solo servicio Python pequeño (FastAPI + pydantic + eventualmente pandas/scikit-learn cuando llegue el modelo real); Poetry aporta resolución de dependencias más robusta y publicación de paquetes, ninguna de las cuales es necesaria aquí.

## 7. Dónde vive Docker

`docker-compose.yml` y `docker-compose.override.yml` en la raíz; un `Dockerfile` por app (`apps/web/Dockerfile`, `apps/api/Dockerfile`, `apps/ml/Dockerfile`). El contenido y estrategia (multi-stage, hot-reload en dev, etc.) se define en el documento 8 — este documento solo fija la ubicación para que el árbol de §1 quede completo.

## 8. Estado: congelado — 2026-07-10

1. **`pip` + `venv` para `apps/ml` (§6)** — aprobado.
2. **`pnpm dev` con `concurrently` (§3)** — aprobado.

Siguiente documento: [11-convenciones-proyecto.md](11-convenciones-proyecto.md) — convenciones del proyecto.
