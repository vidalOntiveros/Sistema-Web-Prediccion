import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../common/types/authenticated-user';

export interface StudentScopeFilter {
  teachers?: { some: { teacherId: string } };
}

// Resuelve el alcance :all/:own (docs/06-diseno-api-rest.md §4.2). El guard ya
// verificó que el usuario tenga al menos uno de los dos permisos — aquí solo se
// decide el filtro de Prisma a aplicar.
@Injectable()
export class StudentScopeService {
  resolve(user: AuthenticatedUser): StudentScopeFilter {
    if (user.permissions.includes('students:read:all')) {
      return {};
    }
    return { teachers: { some: { teacherId: user.id } } };
  }
}
