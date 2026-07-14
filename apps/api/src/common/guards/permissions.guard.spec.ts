import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

function createContext(user?: { permissions: string[] }): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function createGuard(
  requiredPermissions: string[] | undefined,
): PermissionsGuard {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(requiredPermissions),
  } as unknown as Reflector;
  return new PermissionsGuard(reflector);
}

describe('PermissionsGuard', () => {
  it('allows access when the endpoint requires no permission', () => {
    const guard = createGuard(undefined);
    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows access when the user has at least one of the required permissions', () => {
    const guard = createGuard(['students:read:all', 'students:read:own']);
    const context = createContext({ permissions: ['students:read:own'] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies access when the user has none of the required permissions', () => {
    const guard = createGuard(['users:write']);
    const context = createContext({ permissions: ['students:read:own'] });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('denies access when there is no authenticated user on the request', () => {
    const guard = createGuard(['users:write']);
    expect(() => guard.canActivate(createContext())).toThrow(
      ForbiddenException,
    );
  });
});
