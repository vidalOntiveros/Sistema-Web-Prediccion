import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { StudentScopeService } from './student-scope.service';

function user(permissions: string[]): AuthenticatedUser {
  return {
    id: 'teacher-1',
    email: 'x@x.com',
    fullName: 'X',
    roleId: 'role-1',
    roleName: 'Docente',
    permissions,
  };
}

describe('StudentScopeService', () => {
  const service = new StudentScopeService();

  it('returns an unrestricted filter for students:read:all', () => {
    expect(service.resolve(user(['students:read:all']))).toEqual({});
  });

  it('filters by the authenticated teacher for students:read:own', () => {
    expect(service.resolve(user(['students:read:own']))).toEqual({
      teachers: { some: { teacherId: 'teacher-1' } },
    });
  });

  it('prefers :all when the user somehow has both permissions', () => {
    expect(
      service.resolve(user(['students:read:own', 'students:read:all'])),
    ).toEqual({});
  });
});
