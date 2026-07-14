# Ver docs/13-estrategia-docker.md — node:22-slim (no alpine) por fricción conocida
# de argon2/Prisma con musl. Build context = raíz del repo (necesita el workspace pnpm).

FROM node:22-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY apps/api apps/api
# Prisma generate no necesita una conexión real, solo una URL con forma válida.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build --chown=node:node /repo/node_modules /repo/node_modules
COPY --from=build --chown=node:node /repo/apps/api /repo/apps/api
WORKDIR /repo/apps/api
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
