import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import {
  AccountInactiveException,
  InvalidCredentialsException,
} from './auth.exceptions';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: {
    findByEmailForAuth: jest.Mock;
    findByIdForAuth: jest.Mock;
    toAuthenticatedUser: jest.Mock;
  };
  let auditService: { record: jest.Mock };
  let activeUser: {
    id: string;
    email: string;
    fullName: string;
    isActive: boolean;
    passwordHash: string;
    createdAt: Date;
    roles: {
      roleId: string;
      role: { id: string; name: string; permissions: never[] };
    }[];
  };

  beforeEach(async () => {
    activeUser = {
      id: 'user-1',
      email: 'docente@itm.edu.mx',
      fullName: 'Docente Uno',
      isActive: true,
      passwordHash: await argon2.hash('correct-password'),
      createdAt: new Date(),
      roles: [
        {
          roleId: 'role-1',
          role: { id: 'role-1', name: 'Docente', permissions: [] },
        },
      ],
    };

    usersService = {
      findByEmailForAuth: jest.fn(),
      findByIdForAuth: jest.fn(),
      toAuthenticatedUser: jest
        .fn()
        .mockImplementation((user: typeof activeUser) => ({
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          roleId: user.roles[0]?.roleId ?? '',
          roleName: user.roles[0]?.role.name ?? '',
          permissions: ['predictions:run:own'],
        })),
    };

    auditService = { record: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: AuditService, useValue: auditService },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('signed-jwt') },
        },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue(7200) },
        },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  it('throws InvalidCredentialsException and audits when the email does not exist', async () => {
    usersService.findByEmailForAuth.mockResolvedValue(null);

    await expect(authService.login('nadie@itm.edu.mx', 'x')).rejects.toThrow(
      InvalidCredentialsException,
    );
    expect(auditService.record).toHaveBeenCalledWith(null, 'LOGIN_FAILED', {
      email: 'nadie@itm.edu.mx',
    });
  });

  it('throws AccountInactiveException for a deactivated user without checking the password', async () => {
    usersService.findByEmailForAuth.mockResolvedValue({
      ...activeUser,
      isActive: false,
    });

    await expect(
      authService.login(activeUser.email, 'wrong-password'),
    ).rejects.toThrow(AccountInactiveException);
  });

  it('throws InvalidCredentialsException for a wrong password and audits the attempt', async () => {
    usersService.findByEmailForAuth.mockResolvedValue(activeUser);

    await expect(
      authService.login(activeUser.email, 'wrong-password'),
    ).rejects.toThrow(InvalidCredentialsException);
    expect(auditService.record).toHaveBeenCalledWith(
      activeUser.id,
      'LOGIN_FAILED',
      {
        email: activeUser.email,
      },
    );
  });

  it('returns an access token and audits success for valid credentials', async () => {
    usersService.findByEmailForAuth.mockResolvedValue(activeUser);

    const result = await authService.login(
      activeUser.email,
      'correct-password',
    );

    expect(result.accessToken).toBe('signed-jwt');
    expect(result.expiresIn).toBe(7200);
    expect(result.user.email).toBe(activeUser.email);
    expect(auditService.record).toHaveBeenCalledWith(
      activeUser.id,
      'LOGIN_SUCCESS',
    );
  });
});
