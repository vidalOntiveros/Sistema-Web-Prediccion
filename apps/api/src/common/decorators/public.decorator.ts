import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Bypassea el JwtAuthGuard global (ver 07-diseno-modulos-nestjs.md §3.1).
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
