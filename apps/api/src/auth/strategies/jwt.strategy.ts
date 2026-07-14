import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../../common/types/authenticated-user';

interface JwtPayload {
  sub: string;
  email: string;
  fullName: string;
  roleId: string;
  roleName: string;
  permissions: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Los permisos ya viajan embebidos en el token desde el login — no se vuelve a
  // consultar la BD en cada request (ver docs/07-diseno-modulos-nestjs.md §3.1).
  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
      roleId: payload.roleId,
      roleName: payload.roleName,
      permissions: payload.permissions,
    };
  }
}
