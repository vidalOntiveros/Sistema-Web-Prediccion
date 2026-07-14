# Diseño de la API REST

Referencia: [01-requerimientos.md](01-requerimientos.md) · [02-casos-uso.md](02-casos-uso.md) · [03-arquitectura.md](03-arquitectura.md) · [04-diseno-base-datos.md](04-diseno-base-datos.md) · [estado-proyecto.md](estado-proyecto.md) · [adr/](adr/)

> Este documento define el contrato HTTP completo de `apps/api` (NestJS). No incluye decisiones internas de módulos/servicios/guards de NestJS — eso es el documento 2 (`07-diseno-modulos-nestjs.md`). Cada grupo de endpoints está etiquetado **[Beta]** o **[v2]** según [ADR-0003](adr/0003-alcance-beta-agosto.md).

## 1. Principios generales

- **Base path:** `/api/v1`. Versionado por prefijo de URL — un cambio incompatible futuro se publicaría como `/api/v2` en paralelo, no reemplazando v1 de golpe.
- **Formato:** JSON en request/response salvo carga de archivos (`multipart/form-data`) y exportación de reportes (`text/csv`).
- **Autenticación:** header `Authorization: Bearer <accessToken>` en todo endpoint protegido. Sin token o token inválido/expirado → `401`.
- **Autorización:** cada endpoint protegido declara qué **clave de permiso** requiere (catálogo en §4). Token válido pero sin el permiso → `403`.
- **Documentación viva:** Swagger/OpenAPI servido en `/api/docs`, generado desde los mismos decoradores que definen los endpoints — no se mantiene a mano por separado.
- **Nombres de recursos:** sustantivos en plural, kebab-case (`/dataset-uploads`, no `/datasetUploads`). Relaciones anidadas solo cuando el hijo no tiene identidad propia fuera del padre (p. ej. `/students/:id/teachers`).
- **Idempotencia de creación:** violar una restricción única (email de usuario, número de control de estudiante) responde `409 Conflict`, nunca crea un duplicado silencioso.

## 2. Paginación, filtros y orden

Todo endpoint de listado usa el mismo sobre de respuesta:

```json
{
  "data": [ /* items */ ],
  "meta": { "page": 1, "pageSize": 20, "total": 134, "totalPages": 7 }
}
```

- Query params comunes: `page` (default 1), `pageSize` (default 20, máx 100).
- Orden: `sort=campo:asc|desc` (p. ej. `sort=createdAt:desc`). Si no se manda, cada endpoint documenta su orden por defecto.
- Filtros: query params específicos por recurso (documentados por endpoint). Rangos de fecha usan `dateFrom`/`dateTo` (ISO 8601, inclusive).
- Búsqueda de texto libre: `search` cuando aplica (coincidencia parcial case-insensitive sobre los campos que documente el endpoint).

## 3. Formato de errores y códigos HTTP

Sobre de error único para toda la API:

```json
{
  "statusCode": 422,
  "error": "DATASET_VALIDATION_FAILED",
  "message": "El archivo tiene errores de validación en 3 filas.",
  "details": [
    { "row": 12, "field": "semestre", "issue": "debe ser un entero entre 1 y 12" }
  ]
}
```

`error` es un código estable en mayúsculas (para que el frontend haga match sin parsear `message`, que es para humanos). `details` es opcional y su forma varía por endpoint (documentada donde aplique).

| Código | Cuándo se usa |
|---|---|
| `200` | Lectura u operación exitosa sin creación de recurso |
| `201` | Recurso creado |
| `204` | Operación exitosa sin cuerpo de respuesta (logout, unassign) |
| `400` | Payload malformado / validación de tipos básica (DTO) |
| `401` | Sin token, token inválido o expirado |
| `403` | Token válido, permiso o alcance insuficiente |
| `404` | Recurso no existe **o** existe pero está fuera del alcance del usuario (ver §4.2) |
| `409` | Conflicto de unicidad (email, número de control) |
| `422` | Regla de negocio violada con datos por lo demás bien formados (validación de dataset, predicción sin datos suficientes) |
| `429` | Rate limit excedido (login) |
| `502` | El servicio ML no respondió o respondió con error al ejecutar una predicción |
| `500` | Error no esperado |

## 4. RBAC: catálogo de permisos y alcance (scope)

### 4.1 Catálogo de permisos

Extiende la matriz de [02-casos-uso.md](02-casos-uso.md) §4 con nombres concretos de clave, formato `recurso:accion[:alcance]`:

| Clave | Descripción |
|---|---|
| `users:read` | Ver usuarios |
| `users:write` | Crear/editar/(des)activar usuarios, asignar rol, resetear contraseña |
| `roles:read` | Ver catálogo de roles y permisos |
| `roles:manage` | **[v2]** Crear/editar roles y su matriz de permisos |
| `students:read:all` | Ver todos los estudiantes |
| `students:read:own` | Ver solo estudiantes asignados al usuario (Docente) |
| `students:write` | Crear/editar estudiantes, asignar/quitar docentes |
| `datasets:upload` | Cargar datasets |
| `datasets:read` | Ver historial de cargas |
| `dataset-columns:manage` | **[v2]** Editar catálogo de columnas del dataset |
| `predictions:run:all` | Ejecutar predicción sobre cualquier estudiante |
| `predictions:run:own` | Ejecutar predicción solo sobre estudiantes asignados |
| `predictions:read:all` | Ver historial de predicciones de cualquier estudiante |
| `predictions:read:own` | Ver historial solo de estudiantes asignados |
| `dashboard:read` | Ver estadísticas agregadas |
| `reports:export` | Exportar reportes |
| `config:read` | Ver parámetros del sistema |
| `config:manage` | Editar parámetros del sistema |
| `audit:read` | Ver bitácora de auditoría |

`dataset-columns:read` (catálogo de columnas) **no requiere permiso especial** — cualquier usuario autenticado puede leerlo, porque es metadata necesaria para renderizar formularios y no contiene datos de estudiantes.

**Matriz beta** (seed inicial, editable solo por datos, nunca por código):

| Rol | Permisos |
|---|---|
| Administrador | todos los de arriba |
| Coordinador | `users:read` (no `write`), `students:read:all`, `students:write`, `datasets:upload`, `datasets:read`, `predictions:run:all`, `predictions:read:all`, `dashboard:read`, `reports:export` |
| Docente | `students:read:own`, `predictions:run:own`, `predictions:read:own` |

### 4.2 Resolución de alcance (`:all` vs `:own`)

Decisión de diseño nueva (no estaba en `03-arquitectura.md`): para los tres pares `students`, `predictions:run`, `predictions:read`, el guard de NestJS exige **uno de los dos** permisos del par (`:all` o `:own`) y el service layer decide el filtro:

- Si el usuario tiene la variante `:all` → sin filtro adicional.
- Si solo tiene `:own` → se filtra por la relación `TeacherStudent` (estudiantes asignados al usuario autenticado).
- Si no tiene ninguna de las dos → `403`.

Esto mantiene el principio de "guard genérico, sin lógica de rol hardcodeada" (`03-arquitectura.md` §5): el guard solo verifica que exista al menos uno de los permisos declarados por el endpoint; la resolución de *cuál* aplica y el filtrado consecuente vive en el service, no en el guard.

**Regla de fuga de información:** cuando un usuario con solo `:own` pide por `id` un estudiante o predicción que existe pero no está en su alcance, la respuesta es **`404`, no `403`** — evita confirmar que el recurso existe. Los endpoints de detalle lo indican explícitamente abajo.

## 5. Endpoints

### 5.1 Auth — **[Beta]**

| Método | Ruta | Permiso | Notas |
|---|---|---|---|
| POST | `/auth/login` | público | rate limit: 5 intentos / 15 min por combinación IP+email |
| POST | `/auth/logout` | autenticado | invalidación solo del lado cliente (ver [ADR-0004](adr/0004-sesion-jwt-sin-revocacion.md)) |
| GET | `/auth/me` | autenticado | perfil + permisos efectivos actuales |

**POST /auth/login**
Request: `{ "email": "string", "password": "string" }`
Response `200`:
```json
{
  "accessToken": "jwt",
  "expiresIn": 7200,
  "user": {
    "id": "uuid", "fullName": "string", "email": "string",
    "role": { "id": "uuid", "name": "Docente" },
    "permissions": ["students:read:own", "predictions:run:own", "predictions:read:own"]
  }
}
```
Errores: `401` credenciales inválidas, `403 ACCOUNT_INACTIVE` cuenta desactivada, `429` rate limit. Todo intento (éxito o fallo) se registra en `AuditLog` (RF-05).

**POST /auth/logout** → `204`. Registra evento en `AuditLog`.

**GET /auth/me** → mismo shape que `user` en login. El frontend lo llama al cargar la app en vez de confiar solo en el payload decodificado del JWT, por si los permisos cambiaron server-side desde que se emitió el token.

---

### 5.2 Users — **[Beta]** (permiso: `users:read` / `users:write`)

| Método | Ruta | Permiso | Notas |
|---|---|---|---|
| GET | `/users` | `users:read` | filtros: `role`, `isActive`, `search` (nombre/email) |
| GET | `/users/:id` | `users:read` | |
| POST | `/users` | `users:write` | crea con contraseña temporal |
| PATCH | `/users/:id` | `users:write` | edita `fullName`/`email` |
| PATCH | `/users/:id/status` | `users:write` | activar/desactivar |
| PATCH | `/users/:id/role` | `users:write` | asigna un rol existente (beta: un rol por usuario) |
| POST | `/users/:id/reset-password` | `users:write` | genera contraseña temporal nueva |

No existe `DELETE /users/:id` — decisión de [estado-proyecto.md](estado-proyecto.md) §6 (sin borrado físico, solo `isActive`).

**POST /users**
Request: `{ "fullName": "string", "email": "string", "roleId": "uuid" }`
Response `201`: `{ "id": "uuid", "fullName": "...", "email": "...", "isActive": true, "role": {...}, "temporaryPassword": "string" }` — la contraseña temporal se devuelve **una sola vez**, en la respuesta de creación; no se puede volver a consultar.
Errores: `409 EMAIL_ALREADY_EXISTS`.

**POST /users/:id/reset-password**
Request: `{}` (sin body) → Response `200`: `{ "temporaryPassword": "string" }`. Resuelve la ausencia de flujo de "olvidé mi contraseña" (fuera de alcance en beta): el Admin resetea manualmente y comunica la contraseña temporal por fuera del sistema.

**PATCH /users/:id/status**
Request: `{ "isActive": false }` → `200` con el usuario actualizado. Un usuario no puede desactivarse a sí mismo (`422 CANNOT_DEACTIVATE_SELF`).

---

### 5.3 Roles & Permissions — **[Beta: solo lectura]** (permiso: `roles:read`)

| Método | Ruta | Permiso | Notas |
|---|---|---|---|
| GET | `/roles` | `roles:read` | incluye permisos de cada rol |
| GET | `/roles/:id` | `roles:read` | |
| GET | `/permissions` | `roles:read` | catálogo completo, usado para construir UI de v2 |
| POST | `/roles` | `roles:manage` | **[v2]** |
| PATCH | `/roles/:id` | `roles:manage` | **[v2]** |
| PUT | `/roles/:id/permissions` | `roles:manage` | **[v2]** reemplaza el set completo de permisos del rol |
| DELETE | `/roles/:id` | `roles:manage` | **[v2]** solo si no tiene usuarios asignados (`409` si tiene) |

---

### 5.4 Students — **[Beta]**

| Método | Ruta | Permiso | Notas |
|---|---|---|---|
| GET | `/students` | `students:read:all` \| `students:read:own` | filtros: `career`, `semester`, `controlNumber`, `teacherId`, `status`, `search` |
| GET | `/students/:id` | `students:read:all` \| `students:read:own` | `404` si existe pero fuera de alcance (§4.2) |
| POST | `/students` | `students:write` | |
| PATCH | `/students/:id` | `students:write` | edita núcleo + merge de `extraData` |
| POST | `/students/:id/teachers` | `students:write` | `{ "teacherIds": ["uuid"] }` — agrega, no reemplaza |
| DELETE | `/students/:id/teachers/:teacherId` | `students:write` | `204` |

No existe `DELETE /students/:id` — solo `status` (mismo criterio que Users).

**GET /students** (respuesta resumida, sin `extraData` completo — para mantener el listado liviano):
```json
{
  "data": [
    { "id": "uuid", "controlNumber": "20221234", "fullName": "...", "career": "ISC", "semester": 5, "status": "active", "teacherCount": 2 }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 340, "totalPages": 17 }
}
```

**GET /students/:id** (detalle completo):
```json
{
  "id": "uuid", "controlNumber": "20221234", "fullName": "...", "career": "ISC", "semester": 5, "status": "active",
  "extraData": { "promedio_general": 8.1, "materias_reprobadas": 2 },
  "teachers": [{ "id": "uuid", "fullName": "..." }],
  "latestPrediction": { "id": "uuid", "riskLevel": "high", "score": 0.87, "createdAt": "2026-08-01T10:00:00Z" }
}
```

**POST /students**
Request: `{ "controlNumber": "string", "fullName": "string", "career": "string", "semester": 1, "extraData": { "...": "..." } }`
`extraData` se valida contra `DatasetColumnDefinition` activo (mismas reglas que la carga masiva, §5.6). Errores: `409 CONTROL_NUMBER_ALREADY_EXISTS`, `422 EXTRA_DATA_VALIDATION_FAILED` (mismo formato `details` que la carga de dataset).

---

### 5.5 Dataset Columns — **[Beta: solo lectura]**

| Método | Ruta | Permiso | Notas |
|---|---|---|---|
| GET | `/dataset-columns` | autenticado (sin permiso especial) | solo columnas `active=true`, ordenadas por `displayOrder` |
| POST | `/dataset-columns` | `dataset-columns:manage` | **[v2]** |
| PATCH | `/dataset-columns/:id` | `dataset-columns:manage` | **[v2]** (incluye desactivar) |

**GET /dataset-columns** → `200`: `[{ "id": "uuid", "key": "promedio_general", "label": "Promedio general", "dataType": "number", "required": true, "displayOrder": 1 }]`. En beta este catálogo se puebla por seed script (Fase 3 del roadmap), no por este endpoint.

---

### 5.6 Dataset Uploads — **[Beta]**

| Método | Ruta | Permiso | Notas |
|---|---|---|---|
| POST | `/dataset-uploads` | `datasets:upload` | `multipart/form-data`, campo `file` |
| GET | `/dataset-uploads` | `datasets:read` | filtros: `status`, `uploadedBy`, `dateFrom`/`dateTo` |
| GET | `/dataset-uploads/:id` | `datasets:read` | incluye reporte de errores si `status=failed` |
| POST | `/dataset-uploads/:id/revert` | `datasets:manage` | **[v2]** |

**POST /dataset-uploads** — procesamiento **síncrono** en beta (sin cola), límite de filas configurable (`SystemConfig`, default 2000). Flujo:
1. Parsear CSV/XLSX.
2. Validar cada fila contra `DatasetColumnDefinition` activo (tipo, obligatoriedad).
3. Si hay **cualquier** error de validación → no se aplica ningún cambio (todo o nada) y se responde `422`.
4. Si es válido → crea/actualiza estudiantes (match por `controlNumber`) dentro de una transacción, y se responde `201`.

Response `201` (éxito):
```json
{ "id": "uuid", "fileName": "estudiantes_ago2026.csv", "status": "completed", "totalRows": 340, "createdCount": 300, "updatedCount": 40, "createdAt": "..." }
```
Response `422` (validación fallida) — usa el sobre de error estándar (§3), `details` es un arreglo de `{ row, field, issue }` por cada celda inválida, hasta un máximo de 200 entradas (si hay más errores, `message` lo indica y sugiere corregir por lotes).

Errores adicionales: `400 UNSUPPORTED_FILE_TYPE`, `413 FILE_TOO_LARGE`, `422 ROW_LIMIT_EXCEEDED`.

---

### 5.7 Predictions — **[Beta: individual]**

| Método | Ruta | Permiso | Notas |
|---|---|---|---|
| POST | `/predictions` | `predictions:run:all` \| `predictions:run:own` | ejecuta una predicción individual |
| GET | `/predictions` | `predictions:read:all` \| `predictions:read:own` | filtros: `studentId`, `career`, `riskLevel`, `dateFrom`/`dateTo` |
| GET | `/predictions/:id` | `predictions:read:all` \| `predictions:read:own` | `404` si fuera de alcance |
| POST | `/predictions/batch` | `predictions:run:all` | **[v2]** `{ career?, semester?, studentIds? }` |

**POST /predictions**
Request: `{ "studentId": "uuid" }`
Flujo interno: valida alcance (si es `:own`, el estudiante debe estar asignado) → `buildPredictionPayload(student)` → `POST` al servicio ML (contrato de [ADR-0001](adr/0001-contrato-integracion-ml.md)) → calcula `riskLevel` si el ML no lo mandó (umbral de `SystemConfig`) → genera recomendaciones por reglas ([ADR-0002](adr/0002-recomendaciones-generadas-en-api.md)) → persiste `Prediction`.

Response `201`:
```json
{
  "id": "uuid", "studentId": "uuid", "executedBy": "uuid", "modelVersion": "mock-v0",
  "riskLevel": "high", "score": 0.87,
  "topFactors": [{ "feature": "materias_reprobadas", "contribution": 0.41 }],
  "recommendations": [{ "title": "Canalizar a tutoría académica", "description": "..." }],
  "createdAt": "..."
}
```
Errores: `404` estudiante no existe o fuera de alcance, `422 INSUFFICIENT_STUDENT_DATA` (faltan campos que el modelo requiere), `502 ML_SERVICE_UNAVAILABLE` (no se persiste ninguna `Prediction` — UC-06 flujo alterno).

**GET /predictions** (resumen, sin `topFactors`/`recommendations` completos):
```json
{ "data": [{ "id": "uuid", "studentId": "uuid", "studentName": "...", "riskLevel": "high", "score": 0.87, "modelVersion": "mock-v0", "createdAt": "..." }], "meta": {...} }
```

---

### 5.8 Dashboard — **[Beta: agregados puntuales]**

| Método | Ruta | Permiso | Notas |
|---|---|---|---|
| GET | `/dashboard/summary` | `dashboard:read` | sin filtros por fecha en beta |
| GET | `/dashboard/trends` | `dashboard:read` | **[v2]** series de tiempo |

**GET /dashboard/summary**:
```json
{
  "totalStudents": 340, "totalPredictions": 512, "highRiskCount": 48,
  "byCareer": [{ "career": "ISC", "total": 120, "highRisk": 18 }]
}
```
Scope: si el usuario que consulta solo tiene `predictions:read:own`/`students:read:own` (Docente), este endpoint responde `403` — Docente no tiene `dashboard:read` en la matriz beta (UC-08).

---

### 5.9 Reports — **[Beta: solo CSV]**

| Método | Ruta | Permiso | Notas |
|---|---|---|---|
| GET | `/reports/predictions/export` | `reports:export` | query: `format=csv` (`format=pdf` → **[v2]**), más los mismos filtros que `GET /predictions` |

Response `200`, `Content-Type: text/csv`, `Content-Disposition: attachment; filename="predicciones_2026-08-01.csv"`. Si `format=pdf` en beta → `400 UNSUPPORTED_FORMAT` con `message` indicando que estará disponible en v2.

---

### 5.10 System Config — **[Beta: subconjunto]**

| Método | Ruta | Permiso | Notas |
|---|---|---|---|
| GET | `/system-config` | `config:read` | devuelve todas las claves |
| PATCH | `/system-config/:key` | `config:manage` | beta: solo `risk_threshold` y `careers_catalog` son editables vía API; el resto se administra por seed |

**PATCH /system-config/:key**
Request: `{ "value": { "...": "..." } }` → `200` con el registro actualizado. `404 CONFIG_KEY_NOT_FOUND` si la clave no existe, `403 CONFIG_KEY_NOT_EDITABLE` si la clave no está en la lista editable de beta.

---

### 5.11 Audit Log — **[Beta: solo lectura]**

| Método | Ruta | Permiso | Notas |
|---|---|---|---|
| GET | `/audit-logs` | `audit:read` | filtros: `userId`, `action`, `dateFrom`/`dateTo` |

```json
{ "data": [{ "id": "uuid", "userId": "uuid", "userName": "...", "action": "LOGIN_FAILED", "metadata": {...}, "createdAt": "..." }], "meta": {...} }
```

---

## 6. Resumen Beta vs. v2

| Módulo | Beta | v2 |
|---|---|---|
| Auth | login, logout, me | — |
| Users | CRUD sin borrado físico, reset password | — |
| Roles | solo lectura | CRUD completo |
| Students | CRUD sin borrado físico, asignación docente | — |
| Dataset Columns | solo lectura (seed) | CRUD vía UI |
| Dataset Uploads | carga síncrona, historial | revert, procesamiento async |
| Predictions | individual | por lote |
| Dashboard | agregados puntuales | series de tiempo |
| Reports | CSV | PDF |
| System Config | 2 claves editables | catálogo completo editable |
| Audit Log | solo lectura | — |

## 7. Estado: congelado — 2026-07-10

Los 4 puntos abiertos quedaron resueltos así:

1. **Scoping `:all`/`:own` (§4.2):** aprobado tal cual — guard genérico exige uno de los dos permisos del par, el service resuelve el filtro.
2. **Reset de contraseña por Admin:** aprobado tal cual — contraseña temporal visible una sola vez, comunicada fuera del sistema.
3. **Límite de filas por carga de dataset:** 2000 filas, configurable en `SystemConfig` (`dataset_upload_row_limit`).
4. **Dashboard sin filtro de fecha en beta:** aprobado — sin filtro de periodo académico en beta (v2).

Este documento es la referencia vigente del contrato HTTP para implementación. Cambios posteriores se documentan como ADR si alteran una decisión ya congelada aquí, o se editan directamente si son correcciones menores (typos, endpoints faltantes que no cambian ninguna decisión).

Siguiente documento: [07-diseno-modulos-nestjs.md](07-diseno-modulos-nestjs.md) — diseño de módulos de NestJS.
