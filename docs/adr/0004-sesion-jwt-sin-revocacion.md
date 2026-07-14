# ADR-0004: Sesión JWT sin invalidación server-side en beta

**Estado:** Aceptado — 2026-07-10
**Sustituye:** el vacío de diseño en `03-arquitectura.md` §7 y `04-diseno-base-datos.md`, donde RF-04 ("cerrar sesión e invalidar el token activo") no tiene tabla ni mecanismo de revocación asociado.

## Contexto

RF-02 pide JWT con expiración y renovación (refresh token); RF-04 pide que logout invalide el token activo. Ninguno de los dos es gratis de implementar bien: refresh token con rotación segura requiere almacenar sesiones/tokens y manejar su revocación; invalidar un JWT stateless antes de su expiración natural requiere una blacklist o tabla de sesión — ninguna de las dos está modelada en el ER actual.

Para un sistema interno de 3 roles institucionales y bajo tráfico, construir esto "bien" (rotación + revocación real) es complejidad desproporcionada para el valor que aporta en un beta.

## Opciones consideradas

1. Construir refresh token con rotación + tabla de sesión con revocación real desde el beta.
2. Access token de vida corta (p. ej. 2 horas), sin refresh token ni invalidación server-side; logout solo descarta el token en el cliente.

## Decisión

Se adopta la opción 2 para el beta. El logout borra el token en el cliente y registra el evento en `AuditLog`; el token sigue siendo técnicamente válido hasta su expiración natural si alguien lo captura, lo cual es una limitación conocida y documentada, no un descuido.

## Consecuencias

- RF-04 no se cumple al 100% en el beta (invalidación real de token) — se documenta como limitación conocida en `docs/estado-proyecto.md` y en el manual técnico.
- Si la ventana de exposición de 2 horas resulta inaceptable antes de diciembre, la mitigación de v2 es agregar una tabla `Session`/`RefreshToken` con revocación — cambio aditivo (una tabla + un chequeo en el guard), no una reescritura del módulo de auth.
- Simplifica el desarrollo del módulo de Auth en la Fase 2 del roadmap de beta, evitando construir infraestructura de sesión antes de tener usuarios reales que la necesiten.
