# Diseño del frontend (`apps/web`)

Referencia: [06-diseno-api-rest.md](06-diseno-api-rest.md) · [02-casos-uso.md](02-casos-uso.md) · [03-arquitectura.md](03-arquitectura.md)

> Este documento define cómo `apps/web` (Next.js) consume la API de `06-diseno-api-rest.md`: manejo de sesión, obtención de datos, rutas/pantallas, y componentes compartidos. No es código todavía.

## 1. Decisión de arquitectura: patrón BFF con cookie httpOnly

**Problema:** dónde vive el JWT en el navegador. Dos opciones reales:

| Opción | Descripción | Riesgo |
|---|---|---|
| A. SPA con JWT en el cliente | El `accessToken` de `POST /auth/login` se guarda en memoria/localStorage y el navegador llama directo a `apps/api` con `Authorization: Bearer`. | Cualquier XSS (por mínimo que sea, p. ej. una librería de terceros comprometida) puede leer el token y exfiltrarlo. RNF-04 pide explícitamente protección contra XSS. |
| **B. BFF con cookie httpOnly (elegida)** | El login pasa por una Route Handler de Next.js que llama a `apps/api`, recibe el `accessToken` y lo guarda en una cookie `httpOnly; Secure; SameSite=Lax`. El navegador nunca ve el token en JS. Toda llamada del cliente a la API pasa por un proxy interno de Next.js que lee la cookie server-side y la reenvía como `Authorization: Bearer` a `apps/api`. | Requiere una capa de proxy adicional (más código que A). |

Se elige **B**. Es el patrón estándar de Next.js App Router para este problema y es consistente con RNF-04; el costo adicional (una Route Handler de proxy) es bajo y se escribe una sola vez.

**Flujo de login:**
1. Cliente hace `POST` a `/app/api/auth/login` (Route Handler de Next.js, no la API de Nest directamente).
2. Esa Route Handler llama a `POST {NEST_API_URL}/auth/login`, recibe `{ accessToken, expiresIn, user }`.
3. Setea cookie `session` = `accessToken` (`httpOnly`, `Secure` en producción, `SameSite=Lax`, `maxAge=expiresIn`).
4. Devuelve al cliente solo `{ user }` (sin el token) — el cliente guarda `user` en el `AuthContext` para render condicional por rol/permiso.

**Flujo de requests autenticados:**
- Todo componente cliente que necesita datos llama a una Route Handler interna bajo `/app/api/proxy/[...path]/route.ts`, que lee la cookie `session`, reenvía el request a `apps/api` con el header `Authorization`, y devuelve la respuesta tal cual (incluyendo el código de estado). Un solo archivo maneja el proxy para todos los recursos — no se escribe una Route Handler por endpoint.
- Si `apps/api` responde `401` (token expirado), el proxy borra la cookie y el cliente redirige a `/login`.

**`middleware.ts`** protege los grupos de rutas autenticadas verificando solo que la cookie exista (no decodifica permisos ahí — eso lo resuelve el `AuthContext` en cliente con lo que devolvió `/auth/me`). Si no hay cookie, redirige a `/login` antes de renderizar nada.

## 2. Renderizado: Client Components + TanStack Query (sin SSR autenticado)

Este es un sistema interno detrás de login, no un sitio público sensible a SEO — el valor de SSR es bajo y añade complejidad de mezclar fetch en Server Components con el patrón de cookie/proxy de arriba. Decisión: **todas las pantallas autenticadas son Client Components**, usando **TanStack Query** para fetch/cache/mutaciones contra el proxy interno. Next.js aporta ruteo, bundling y la capa BFF (§1), no SSR de datos de negocio.

- `useQuery` para lecturas (listados, detalle), con `queryKey` incluyendo los filtros activos (p. ej. `['students', { career, semester, page }]`) para que TanStack Query cachee/invalide correctamente.
- `useMutation` para escrituras (crear/editar/asignar/ejecutar predicción), con `invalidateQueries` sobre las claves relacionadas al terminar con éxito.
- No se introduce Redux/Zustand — el estado de servidor lo maneja TanStack Query y el único estado de cliente global real es la sesión (`AuthContext`, poblado por `/auth/me` al montar la app). No hay suficiente estado de UI compartido entre pantallas para justificar una librería adicional.

## 3. Autorización en el frontend

**Principio:** el frontend nunca es la fuente de verdad de autorización — solo mejora la UX ocultando/deshabilitando lo que el usuario no puede hacer. La aplicación real de permisos siempre ocurre en `apps/api` (`PermissionsGuard`). Un `403` de la API en cualquier mutación se muestra como error, nunca se asume que "si el botón está visible, la acción va a funcionar".

- `AuthContext` expone `{ user, permissions: string[] }`.
- Hook `useHasPermission(...keys: string[])` — `true` si el usuario tiene alguno de los permisos dados (mismo modelo "al menos uno" que `@RequirePermission` en el backend, ver `07-diseno-modulos-nestjs.md` §3.2).
- Componente `<Can permission="students:write">...</Can>` para ocultar condicionalmente botones/secciones sin repetir `useHasPermission` en cada JSX.
- Rutas por rol no se ocultan por completo vía `middleware.ts` (eso solo verifica sesión) — cada página verifica su propio permiso mínimo con `useHasPermission` y muestra un estado "Acceso denegado" si no lo tiene, en vez de redirigir silenciosamente (mejor para debugging y para que quede claro qué pasó).

## 4. Estructura de carpetas

```
apps/web/src/
├── app/
│   ├── (public)/login/page.tsx
│   ├── (app)/                        # grupo protegido por middleware
│   │   ├── layout.tsx                 # shell: nav por rol, AuthProvider, QueryClientProvider
│   │   ├── dashboard/page.tsx
│   │   ├── students/page.tsx
│   │   ├── students/new/page.tsx
│   │   ├── students/[id]/page.tsx
│   │   ├── dataset-uploads/page.tsx
│   │   ├── dataset-uploads/new/page.tsx
│   │   ├── predictions/page.tsx       # historial global
│   │   ├── users/page.tsx
│   │   ├── audit/page.tsx
│   │   └── config/page.tsx
│   └── api/
│       ├── auth/login/route.ts
│       ├── auth/logout/route.ts
│       └── proxy/[...path]/route.ts
├── components/
│   ├── ui/                # shadcn/ui (generado, no se edita a mano salvo necesidad real)
│   ├── layout/             # AppShell, RoleNav
│   ├── students/           # StudentTable, StudentForm, DynamicField
│   ├── predictions/        # PredictionResultCard, RiskBadge
│   └── shared/             # DataTable genérica (paginación/orden), ErrorState, EmptyState
├── hooks/
│   ├── use-auth.ts
│   ├── use-has-permission.ts
│   └── use-*-query.ts / use-*-mutation.ts  # uno por recurso, envuelve TanStack Query + llamada al proxy
├── lib/
│   ├── api-client.ts       # fetch wrapper hacia /app/api/proxy, maneja 401 global
│   └── validation/         # schemas zod de formularios (espejo manual de los DTOs del backend, no generado)
└── context/auth-context.tsx
```

## 5. Formularios y validación

- `react-hook-form` + resolver `zod` en todo formulario de escritura. Los schemas de `lib/validation/` son un **espejo manual** de los DTOs del backend (documento 2) — no hay generación automática de tipos compartidos en beta (`packages/shared-types` sigue diferido, ver `03-arquitectura.md` §9). Riesgo aceptado: si un DTO del backend cambia, hay que actualizar el schema del frontend a mano; se documenta como recordatorio en `docs/estado-proyecto.md` si se vuelve una fuente de bugs.
- Errores `422` con `details` (formato de `06-diseno-api-rest.md` §3) se mapean a errores por campo en el formulario cuando `details[].field` coincide con un campo del form; si no coincide (p. ej. error a nivel de fila de un CSV) se muestra en un bloque de errores general.

### Formulario dinámico de estudiante (`extraData`)

Componente `DynamicField`, alimentado por `GET /dataset-columns`: por cada columna activa del catálogo, renderiza el input según `dataType` (`string` → text input, `number` → number input, `boolean` → checkbox, `date` → date picker) y arma dinámicamente las reglas de validación (`required` del catálogo) antes de enviar `extraData` junto con los campos núcleo. Este componente es el único lugar del frontend que necesita cambiar si el catálogo de columnas cambia — el resto del formulario de estudiante no sabe nada de columnas específicas.

## 6. Pantallas por rol

| Ruta | Casos de uso | Permiso mínimo | Notas |
|---|---|---|---|
| `/login` | UC-01 | público | |
| `/dashboard` | UC-08 | `dashboard:read` | Docente no lo ve en nav (no tiene el permiso); si entra por URL directa, `403` explícito |
| `/students` | UC-05, UC-12 | `students:read:all` \| `students:read:own` | tabla con filtros, botón "Nuevo estudiante" solo si `students:write` |
| `/students/new` | UC-05 | `students:write` | formulario con `DynamicField` |
| `/students/[id]` | UC-05, UC-06, UC-07, UC-09, UC-12 | `students:read:*` | detalle + botón "Ejecutar predicción" (si `predictions:run:*`) + historial de predicciones del estudiante + gestión de docentes asignados (si `students:write`) |
| `/dataset-uploads` | UC-04 | `datasets:read` | historial de cargas |
| `/dataset-uploads/new` | UC-04 | `datasets:upload` | subir archivo, preview de errores antes/después de confirmar |
| `/predictions` | UC-07 | `predictions:read:all` \| `predictions:read:own` | historial global con filtros (distinto del historial embebido en detalle de estudiante) |
| `/users` | UC-02 | `users:read`/`users:write` | Coordinador ve la lista (`users:read`) pero no ve botones de escritura |
| `/audit` | — | `audit:read` | solo lectura |
| `/config` | UC-11 | `config:read`/`config:manage` | beta: solo 2 claves editables (§5.10 de `06-diseno-api-rest.md`) |

No existe pantalla de "crear rol" ni "editar catálogo de columnas" en beta (v2, ver `docs/estado-proyecto.md`).

## 7. Componentes compartidos clave

- **`DataTable`**: tabla genérica con paginación/orden ligada al sobre `{ data, meta }` de la API — se construye una vez y la reutilizan `students`, `predictions`, `users`, `audit`, `dataset-uploads`.
- **`RiskBadge`**: pastilla de color por `riskLevel` (low/medium/high), único lugar que mapea nivel de riesgo a color — evita repetir la lógica de color en cada pantalla que muestra una predicción.
- **`ErrorState`** / **`EmptyState`**: estados reutilizables para "sin permiso" (403), "no encontrado" (404) y "sin resultados", en vez de manejarlos ad hoc por pantalla.

## 8. Estado: congelado — 2026-07-10

1. **Patrón BFF con cookie httpOnly (§1)** — aprobado.
2. **Client Components + TanStack Query, sin SSR autenticado (§2)** — aprobado.
3. **Espejo manual de schemas zod en beta (§5)** — aprobado; riesgo de desincronización documentado como algo a vigilar, no a resolver ahora.

Siguiente documento: [09-contrato-ml-definitivo.md](09-contrato-ml-definitivo.md) — contrato definitivo entre Backend y Servicio ML.
