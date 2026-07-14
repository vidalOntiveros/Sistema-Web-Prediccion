import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { AuthenticatedUser } from '../types/authenticated-user';

// Solo decide sí/no según si el usuario tiene AL MENOS UNO de los permisos
// requeridos por el endpoint (@RequirePermission). No decide alcance (:all vs :own)
// — eso lo resuelve el service correspondiente (ver docs/07-diseno-modulos-nestjs.md §3.2, §5).
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (
      !user ||
      !requiredPermissions.some((permission) =>
        user.permissions.includes(permission),
      )
    ) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción.',
      );
    }

    return true;
  }
}
