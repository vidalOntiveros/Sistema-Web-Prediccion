# Documento de Requerimientos

**Proyecto:** Sistema Web de Predicción de Deserción / Rendimiento Estudiantil
**Institución:** Instituto Tecnológico de Mazatlán
**Fecha:** Julio 2026
**Entrega máxima:** Diciembre 2026

## 1. Objetivo del sistema

Desarrollar un sistema web que permita a personal administrativo, coordinadores y docentes del ITM cargar información académica de estudiantes, ejecutar modelos de predicción (riesgo de deserción / bajo rendimiento) y consultar resultados, historial y recomendaciones de intervención, con roles y permisos diferenciados.

## 2. Alcance

Incluye:
- Autenticación y control de acceso basado en roles (RBAC).
- Administración de usuarios y roles.
- Carga y gestión de datasets de estudiantes con estructura de columnas flexible.
- Gestión de estudiantes (alta, edición, consulta, asignación a docentes).
- Ejecución de predicciones mediante un servicio de Machine Learning.
- Consulta de historial de predicciones y recomendaciones de intervención.
- Estadísticas y reportes exportables.
- Configuración de parámetros del sistema.
- Despliegue local vía Docker, preparado para despliegue en la nube sin cambios arquitectónicos importantes.

No incluye (fuera de alcance por ahora):
- Integración directa en tiempo real con el sistema institucional oficial de control escolar (se trabajará con datasets cargados manualmente/por lote).
- App móvil nativa.
- Reentrenamiento automático de modelos sin intervención humana (fase inicial usará modelos entrenados offline, servidos vía API).

## 3. Requerimientos funcionales

### 3.1 Autenticación y control de acceso

| ID | Requerimiento |
|----|----------------|
| RF-01 | El sistema debe permitir inicio de sesión con correo/usuario y contraseña. |
| RF-02 | El sistema debe emitir tokens de sesión (JWT) con expiración y renovación (refresh token). |
| RF-03 | El sistema debe restringir el acceso a módulos y acciones según el rol del usuario autenticado. |
| RF-04 | El sistema debe permitir cerrar sesión e invalidar el token activo. |
| RF-05 | El sistema debe registrar intentos fallidos de inicio de sesión (bitácora de seguridad). |

### 3.2 Administración de usuarios y roles (Administrador)

| ID | Requerimiento |
|----|----------------|
| RF-06 | El Administrador debe poder crear, editar, desactivar y eliminar usuarios. |
| RF-07 | El Administrador debe poder asignar uno o más roles a un usuario. |
| RF-08 | El Administrador debe poder crear, editar y eliminar roles. |
| RF-09 | El Administrador debe poder asignar/quitar permisos individuales a un rol. |
| RF-10 | El sistema debe impedir que un usuario sin permiso de administración de usuarios acceda a esos módulos, incluso por URL directa. |

### 3.3 Gestión de estudiantes

| ID | Requerimiento |
|----|----------------|
| RF-11 | El sistema debe permitir dar de alta, editar y consultar estudiantes. |
| RF-12 | El sistema debe permitir buscar/filtrar estudiantes por carrera, semestre, número de control, docente asignado, etc. |
| RF-13 | El sistema debe permitir asignar estudiantes a uno o varios docentes. |
| RF-14 | Un Docente solo debe poder consultar los estudiantes que tiene asignados. |
| RF-15 | El sistema debe soportar campos adicionales por estudiante más allá de las columnas base, sin requerir cambios de código (ver RNF-01). |

### 3.4 Carga de datasets

| ID | Requerimiento |
|----|----------------|
| RF-16 | El sistema debe permitir cargar datasets de estudiantes (CSV/Excel) por lote. |
| RF-17 | El sistema debe validar el archivo cargado contra el esquema de columnas configurado y reportar errores fila por columna. |
| RF-18 | El sistema debe permitir definir/editar el catálogo de columnas esperadas (nombre, tipo de dato, obligatoriedad) sin modificar el código fuente. |
| RF-19 | El sistema debe conservar un historial de cargas (quién, cuándo, cuántos registros, resultado). |
| RF-20 | El sistema debe permitir revertir/descartar una carga fallida o incorrecta. |

### 3.5 Predicción (Machine Learning)

| ID | Requerimiento |
|----|----------------|
| RF-21 | El sistema debe permitir ejecutar una predicción para un estudiante individual o por lote (carrera, semestre, grupo). |
| RF-22 | El sistema debe mostrar el resultado de la predicción (clasificación de riesgo y probabilidad/score). |
| RF-23 | El sistema debe generar recomendaciones de intervención asociadas al resultado de la predicción. |
| RF-24 | El sistema debe registrar cada predicción ejecutada en un historial (estudiante, fecha, modelo/versión usada, resultado). |
| RF-25 | El servicio de predicción debe ser independiente del backend principal (microservicio ML), consumido vía API interna. |

### 3.6 Historial, estadísticas y reportes

| ID | Requerimiento |
|----|----------------|
| RF-26 | El sistema debe permitir consultar el historial de predicciones filtrando por estudiante, fecha, carrera o docente. |
| RF-27 | El sistema debe mostrar estadísticas agregadas (porcentaje de estudiantes en riesgo por carrera/semestre, tendencias). |
| RF-28 | El sistema debe permitir exportar reportes (CSV/PDF) de resultados y estadísticas. |

### 3.7 Configuración del sistema

| ID | Requerimiento |
|----|----------------|
| RF-29 | El Administrador debe poder configurar parámetros generales del sistema (p. ej. umbral de riesgo, catálogo de columnas del dataset, catálogo de carreras). |
| RF-30 | El Administrador debe poder ver el estado/versión del modelo de predicción activo. |

## 4. Requerimientos no funcionales

| ID | Requerimiento |
|----|----------------|
| RNF-01 | **Flexibilidad de esquema:** debe ser posible agregar o quitar columnas del dataset de estudiantes mediante configuración, sin modificar la arquitectura ni desplegar código nuevo. |
| RNF-02 | **Flexibilidad de permisos:** los roles y permisos deben poder modificarse (agregar/quitar) sin cambios estructurales en el backend. |
| RNF-03 | **Portabilidad de despliegue:** el sistema debe ejecutarse vía Docker Compose en local y poder desplegarse en un servidor Linux o proveedor cloud (AWS/Azure/DigitalOcean) sin cambios de arquitectura, solo de configuración/infraestructura. |
| RNF-04 | **Seguridad:** contraseñas con hash seguro (bcrypt/argon2), autenticación basada en JWT, validación de entradas en todas las capas, protección contra inyección SQL (uso de ORM parametrizado) y XSS. |
| RNF-05 | **Bajo acoplamiento:** el servicio de ML debe poder actualizarse/reemplazarse sin afectar al backend principal ni al frontend. |
| RNF-06 | **Mantenibilidad:** código documentado, tipado estricto (TypeScript/Python typing), convenciones consistentes. |
| RNF-07 | **Usabilidad:** interfaz clara para usuarios no técnicos (docentes, coordinadores), responsive. |
| RNF-08 | **Rendimiento:** carga de datasets de al menos algunos miles de registros sin bloquear la interfaz (procesamiento asíncrono/por lotes). |
| RNF-09 | **Trazabilidad:** todas las acciones sensibles (carga de datos, cambios de usuarios/roles, ejecución de predicciones) deben quedar auditadas. |
| RNF-10 | **Disponibilidad de documentación:** el sistema debe entregarse con documentación técnica y de usuario suficiente para su defensa y mantenimiento futuro. |

## 5. Restricciones

- Stack tecnológico definido previamente: Next.js/React/TypeScript/Tailwind/shadcn (frontend), NestJS/TypeScript/Prisma (backend), FastAPI/Python (ML), PostgreSQL 16, Docker/Docker Compose, pnpm, Node 22 LTS, Python 3.12.
- El dataset definitivo del ITM aún no ha sido entregado; se trabaja con una estructura de referencia flexible.
- Fecha límite institucional: diciembre de 2026. Objetivo personal: finalizar lo antes posible (ver [05-planificacion.md](05-planificacion.md)).
- Roles y permisos iniciales (Administrador, Coordinador, Docente) pueden cambiar durante el desarrollo.

## 6. Supuestos

- El dataset final tendrá una estructura similar a la listada en el brief (número de control, nombre, carrera, semestre, edad, sexo, promedios, materias, créditos, adeudos), pero puede variar en nombres/cantidad de columnas.
- Habrá un conjunto de datos histórico etiquetado (o etiquetable) para entrenar el modelo de predicción; el entrenamiento del modelo en sí se documentará por separado del desarrollo del sistema web.
- Un usuario puede tener un único rol principal en la primera versión (diseño de datos preparado para roles múltiples a futuro, ver [04-diseno-base-datos.md](04-diseno-base-datos.md)).
