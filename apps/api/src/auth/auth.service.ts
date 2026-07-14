import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { UsersService } from '../users/users.service';
import {
  AccountInactiveException,
  InvalidCredentialsException,
} from './auth.exceptions';

export interface LoginResult {
  accessToken: string;
  expiresIn: number;
  user: UserPayload;
}

export interface UserPayload {
  id: string;
  fullName: string;
  email: string;
  role: { id: string; name: string };
  permissions: string[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.usersService.findByEmailForAuth(email);

    if (!user) {
      await this.auditService.record(null, 'LOGIN_FAILED', { email });
      throw new InvalidCredentialsException();
    }

    if (!user.isActive) {
      await this.auditService.record(user.id, 'LOGIN_FAILED', {
        email,
        reason: 'inactive',
      });
      throw new AccountInactiveException();
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      await this.auditService.record(user.id, 'LOGIN_FAILED', { email });
      throw new InvalidCredentialsException();
    }

    const authenticatedUser = this.usersService.toAuthenticatedUser(user);
    const expiresIn = this.configService.getOrThrow<number>('JWT_EXPIRES_IN');

    const accessToken = await this.jwtService.signAsync({
      sub: authenticatedUser.id,
      email: authenticatedUser.email,
      fullName: authenticatedUser.fullName,
      roleId: authenticatedUser.roleId,
      roleName: authenticatedUser.roleName,
      permissions: authenticatedUser.permissions,
    });

    await this.auditService.record(user.id, 'LOGIN_SUCCESS');

    return {
      accessToken,
      expiresIn,
      user: this.toUserPayload(authenticatedUser),
    };
  }

  async me(userId: string): Promise<UserPayload> {
    const user = await this.usersService.findByIdForAuth(userId);
    if (!user) {
      throw new InvalidCredentialsException();
    }
    return this.toUserPayload(this.usersService.toAuthenticatedUser(user));
  }

  private toUserPayload(user: AuthenticatedUser): UserPayload {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: { id: user.roleId, name: user.roleName },
      permissions: user.permissions,
    };
  }
}
