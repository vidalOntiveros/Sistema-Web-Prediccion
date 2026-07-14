import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

// El usuario necesita AL MENOS UNO de los permisos listados (ver el patrón :all/:own
// en docs/06-diseno-api-rest.md §4.2 y docs/07-diseno-modulos-nestjs.md §3.2).
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
