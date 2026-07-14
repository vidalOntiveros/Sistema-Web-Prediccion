import { randomBytes } from 'crypto';

// Contraseña temporal legible, para que el Admin la pueda comunicar por fuera del
// sistema (ver docs/06-diseno-api-rest.md §5.2 y ADR de reset de contraseña).
export function generateTemporaryPassword(): string {
  return randomBytes(9).toString('base64url');
}
