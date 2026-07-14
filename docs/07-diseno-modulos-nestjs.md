# Diseño de módulos de NestJS (`apps/api`)

Referencia: [06-diseno-api-rest.md](06-diseno-api-rest.md) · [03-arquitectura.md](03-arquitectura.md) · [04-diseno-base-datos.md](04-diseno-base-datos.md) · [adr/](adr/)

> Este documento define cómo se organiza el código de `apps/api` para implementar el contrato de `06-diseno-api-rest.md`: módulos, responsabilidades de cada capa, mecanismos transversales (auth, permisos, errores, validación) y dependencias entre módulos. No es código todavía — es la estructura que el código va a seguir.

## 1. Principios de organización

- **Un módulo de Nest por dominio**, alineado 1:1 con los grupos de endpoints del documento 1 (`AuthModule`, `UsersModule`, `RolesModule`, `StudentsModule`, `DatasetColumnsModule`, `DatasetUploadsModule`, `PredictionsModule`, `DashboardModule`, `ReportsModule`, `SystemConfigModule`, `AuditModule`).
- **Capas dentro de cada módulo:** `Controller` (HTTP, validación de forma, mapeo a códigos de estado) → `Service` (reglas de negocio, orquestación) → `PrismaService` (acceso a datos). Los controllers no hablan con Prisma directamente.
- **Nada de lógica de permisos por rol hardcodeada en servicios ni controllers** — toda la decisión de "¿puede hacer esto?" pasa por el `PermissionsGuard` genérico antes de llegar al handler. El servicio solo recibe ya resuelto *qué alcance* aplica (`all` u `own`) para filtrar, no vuelve a preguntar "¿es Docente?".
- **DTOs explícitos, sin interceptores globales que transformen la forma de la respuesta por magia.** Cada endpoint devuelve exactamente el shape documentado en `06-diseno-api-rest.md` porque el controller lo construye así, no porque un interceptor lo envuelva de forma implícita. Es más código, pero es código que se lee y se debuggea sin sorpresas — preferible para un proyecto donde el objetivo es aprender la arquitectura, no solo que funcione.

## 2. Estructura de carpetas

```
apps/api/src/
├── main.ts                      # bootstrap, ValidationPipe global, filtro de excepciones global, Swagger
├── app.module.ts                # ensambla todos los módulos de dominio + infraestructura
├── common/
│   ├── decorators/
│   │   ├── public.decorator.ts          # @Public() — bypassea JwtAuthGuard
│   │   ├── require-permission.decorator.ts  # @RequirePermission('students:write', 'students:read:all')
│   │   └── current-user.decorator.ts    # @CurrentUser() — extrae el usuario del request
│   ├── guards/
│   │   ├── jwt-auth.guard.ts     # global, valida el JWT salvo rutas @Public()
│   │   └── permissions.guard.ts  # lee metadata de @RequirePermission y compara contra permisos efectivos
│   ├── filters/
│   │   └── http-exception.filter.ts  # traduce cualquier excepción al sobre de error de §3 de 06-diseno-api-rest.md
│   ├── pipes/
│   │   └── (ValidationPipe se configura global en main.ts, sin pipe custom adicional por ahora)
│   ├── interceptors/
│   │   └── audit.interceptor.ts  # opcional — ver §4.5
│   └── dto/
│       └── pagination-query.dto.ts   # page/pageSize/sort compartido entre módulos de listado
├── config/
│   └── env.validation.ts        # schema de variables de entorno (zod), falla el boot si falta algo
├── prisma/
│   └── prisma.module.ts / prisma.service.ts   # @Global(), un solo PrismaClient para toda la app
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/jwt.strategy.ts
│   └── dto/ (login.dto.ts, ...)
├── users/          # controller, service, module, dto/
├── roles/
├── students/
│   ├── students.module.ts
│   ├── students.controller.ts
│   ├── students.service.ts
│   ├── scope/student-scope.service.ts   # resuelve filtro :all vs :own (ver §5)
│   └── dto/
├── dataset-columns/
├── dataset-uploads/
│   ├── ...
│   └── parsers/ (csv.parser.ts, xlsx.parser.ts)
├── predictions/
│   ├── ...
│   └── ml-client/ml-client.service.ts   # HTTP client hacia apps/ml
├── dashboard/
├── reports/
├── system-config/
└── audit/
    ├── audit.module.ts
    └── audit.service.ts        # @Global() o importado explícitamente por quien audite
```

## 3. Infraestructura transversal

### 3.1 Autenticación (`JwtAuthGuard` global + `JwtStrategy`)

- `JwtAuthGuard` se registra como **guard global** (`APP_GUARD` en `app.module.ts`). Por defecto, toda ruta requiere JWT válido.
- Rutas públicas (`POST /auth/login`, healthcheck) se marcan con `@Public()`; el guard revisa esa metadata antes de exigir token.
- `JwtStrategy` (passport-jwt) decodifica el token y adjunta al `request` un objeto `AuthenticatedUser { id, roleId, permissions: string[] }`. Los permisos efectivos se resuelven **al emitir el token** (login) y viajan dentro del JWT — no se golpea la base de datos en cada request para saber los permisos. Consecuencia documentada: si un Admin le cambia el rol a un usuario mientras tiene una sesión activa, el cambio no toma efecto hasta que ese usuario vuelva a iniciar sesión (aceptable en beta, dado [ADR-0004](adr/0004-sesion-jwt-sin-revocacion.md) — ya asumimos tokens de vida corta sin invalidación server-side).

### 3.2 Autorización (`PermissionsGuard` + `@RequirePermission`)

- `@RequirePermission('a', 'b')` en un handler significa "el usuario necesita **al menos uno** de estos permisos" (así se expresan los pares `:all`/`:own` de §4.2 de `06-diseno-api-rest.md`).
- `PermissionsGuard` lee esa metadata con `Reflector`, la compara contra `request.user.permissions`. Si no hay intersección → `403`. Si hay, deja pasar y **no decide nada más** — no sabe ni le importa si el resultado será filtrado por `:own`.
- La resolución de *qué* permiso ganó (`all` vs `own`) ocurre dentro del service correspondiente (§5), no en el guard — el guard solo es un portón de sí/no.

### 3.3 Manejo de errores (`HttpExceptionFilter` global)

- Filtro global que captura cualquier excepción (`HttpException` de Nest, `PrismaClientKnownRequestError`, errores no controlados) y la traduce al sobre único de `06-diseno-api-rest.md` §3.
- Las excepciones de negocio se lanzan desde los services como clases propias (`DuplicateControlNumberException`, `MlServiceUnavailableException`, etc.), cada una mapeada a un código HTTP y un `error` string estable en el filtro — así el código de negocio no importa `HttpException` de Nest directamente en cada `throw`, y el mapeo a HTTP queda centralizado en un solo lugar.

### 3.4 Validación de entrada

- `ValidationPipe` global (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`) — cualquier campo no declarado en el DTO se rechaza con `400`, no se ignora silenciosamente.
- DTOs con `class-validator` (`@IsString()`, `@IsUUID()`, `@IsIn([...])`, etc.), uno por operación de escritura (`CreateStudentDto`, `UpdateStudentDto`, no reutilizar el mismo DTO para create/update aunque se parezcan, para que las reglas de "requerido" no se mezclen).
- La validación de `extraData` contra `DatasetColumnDefinition` (tipos dinámicos) **no** se hace con `class-validator` (no puede expresar un schema dinámico) — vive como lógica explícita en `StudentsService`/`DatasetUploadsService`, reutilizando una función compartida `validateExtraData(catalog, row)`.

### 3.5 Auditoría

- `AuditService.record(userId, action, metadata)` — método simple, inyectado directamente en los services que necesitan auditar (`AuthService`, `UsersService`, `DatasetUploadsService`, `PredictionsService`), llamado explícitamente después de la operación exitosa (o del intento fallido de login).
- Se descarta un `AuditInterceptor` global automático: auditar "cualquier request a cualquier endpoint protegido" generaría ruido (un GET de listado no es una acción sensible) y ocultaría *qué* se está auditando detrás de configuración implícita. Llamada explícita en el punto exacto es más simple de razonar y de probar.

## 4. Módulos de dominio

Para cada módulo: controller (mapeo directo a `06-diseno-api-rest.md`), responsabilidad del service, y dependencias hacia otros módulos.

| Módulo | Controller → endpoints | Responsabilidad del Service | Depende de |
|---|---|---|---|
| `AuthModule` | §5.1 | Verificar credenciales, hashear/comparar password (argon2), emitir JWT con permisos embebidos | `UsersModule` (leer usuario+rol+permisos), `AuditModule` |
| `UsersModule` | §5.2 | CRUD de usuarios, generación de contraseña temporal, activar/desactivar, asignar rol | `RolesModule` (validar que el rol exista), `AuditModule` |
| `RolesModule` | §5.3 | Lectura de roles/permisos (beta); CRUD completo en v2 | — |
| `StudentsModule` | §5.4 | CRUD de estudiantes, validación de `extraData` contra catálogo, asignación de docentes, resolución de scope `:all`/`:own` | `DatasetColumnsModule` (catálogo para validar), `AuditModule` |
| `DatasetColumnsModule` | §5.5 | Lectura del catálogo activo (beta); gestión completa en v2 | — |
| `DatasetUploadsModule` | §5.6 | Parseo CSV/XLSX, validación fila por fila contra catálogo, transacción atómica de creación/actualización de estudiantes, historial | `DatasetColumnsModule`, `StudentsModule` (reutiliza `validateExtraData`), `AuditModule` |
| `PredictionsModule` | §5.7 | Orquesta: valida scope → arma payload (`buildPredictionPayload`) → llama a `MlClientService` → calcula `riskLevel` si falta → genera recomendaciones por reglas → persiste | `StudentsModule`, `SystemConfigModule` (umbral de riesgo), `AuditModule` |
| `DashboardModule` | §5.8 | Agregados de solo lectura (queries de conteo/agrupación) | `StudentsModule`, `PredictionsModule` (lectura, sin escribir) |
| `ReportsModule` | §5.9 | Genera CSV a partir de los mismos filtros que `PredictionsModule.findAll` | `PredictionsModule` |
| `SystemConfigModule` | §5.10 | Lectura/escritura de pares clave-valor, valida que la clave esté en la lista editable de beta | — |
| `AuditModule` | §5.11 | Lectura de bitácora + método `record()` usado por otros módulos | — |

**Reglas de dependencia:** los módulos "hoja" (`RolesModule`, `DatasetColumnsModule`, `SystemConfigModule`, `AuditModule`) no dependen de ningún otro módulo de dominio, para evitar ciclos. `PredictionsModule` es el más "alto" en la cadena (depende de Students y SystemConfig) — ninguno de sus módulos dependientes vuelve a importar `PredictionsModule`.

## 5. Estrategia de scoping `:all` / `:own`

Vive como una clase de utilidad por módulo afectado (`StudentScopeService`, reutilizada por `PredictionsService`), no en el guard:

- Recibe `AuthenticatedUser` (con su lista de permisos) y el nombre base del recurso.
- Si `permissions` incluye la variante `:all` → devuelve un filtro vacío (sin restricción).
- Si solo incluye `:own` → devuelve un filtro `{ teacherId: user.id }` que el service aplica a la query de Prisma (vía la relación `TeacherStudent`).
- Se usa en `StudentsService.findAll/findOne` y en `PredictionsService.findAll/findOne/create` (para éstas últimas, filtrando por `student.teachers`).
- El caso de "acceso a un recurso puntual (`GET /students/:id`) que existe pero está fuera del alcance" se resuelve devolviendo `404` desde el service cuando la query con el filtro de scope no encuentra el registro — no hay un paso separado de "verificar si existe" y luego "verificar si es tuyo": una sola query con el filtro aplicado ya responde ambas preguntas a la vez.

## 6. Cliente HTTP hacia el servicio ML

- `MlClientService` (dentro de `PredictionsModule`) encapsula la llamada `POST` al FastAPI (`apps/ml`), usando la URL interna de red de Docker (`ML_SERVICE_URL`, variable de entorno).
- Timeout explícito (propuesta: 8s) — si se excede o el servicio responde error/no disponible, lanza `MlServiceUnavailableException`, mapeada por el filtro global a `502` (§3 de `06-diseno-api-rest.md`). No hay reintentos automáticos en beta (fallar rápido y claro es preferible a reintentar silenciosamente una operación que el usuario ve como síncrona).
- Es el único punto del código que conoce el contrato de [ADR-0001](adr/0001-contrato-integracion-ml.md) — si el contrato cambia de versión, el cambio se concentra aquí y en las DTOs de request/response de este servicio.

## 7. Transacciones

- `DatasetUploadsService.processFile()` corre la validación completa en memoria primero (sin tocar la base de datos); solo si **todas** las filas son válidas abre una transacción de Prisma (`prisma.$transaction`) para crear/actualizar los `Student` y el registro `DatasetUpload` juntos. Si falla cualquier escritura dentro de la transacción, Prisma revierte todo — consistente con la regla de "todo o nada" de §5.6 del documento de API.
- `PredictionsService.create()` no necesita transacción multi-tabla en beta (una sola inserción de `Prediction` con `recommendations` como JSONB embebido, per [ADR-0002](adr/0002-recomendaciones-generadas-en-api.md)).

## 8. Configuración y arranque

- `@nestjs/config` con un schema de validación (`env.validation.ts`, con `zod`) que revienta el `main.ts` en boot si falta una variable requerida (`DATABASE_URL`, `JWT_SECRET`, `ML_SERVICE_URL`, etc.) — preferible a que el error aparezca más tarde como un `500` confuso en producción.
- `main.ts` registra, en orden: `ValidationPipe` global → `HttpExceptionFilter` global → Swagger (`/api/docs`) → prefijo global `/api/v1`.

## 9. Estado: congelado — 2026-07-10

Los 3 puntos abiertos quedaron resueltos así:

1. **Permisos embebidos en el JWT al login** — aprobado. Un cambio de rol no aplica hasta re-login (consistente con [ADR-0004](adr/0004-sesion-jwt-sin-revocacion.md)).
2. **Timeout del cliente ML: 8 segundos** — aprobado.
3. **Auditoría con llamada explícita en cada service** — aprobado, sin interceptor global.

Siguiente documento: [08-diseno-frontend.md](08-diseno-frontend.md) — diseño del frontend.
