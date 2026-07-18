'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch, PaginatedResponse } from '@/lib/api-client';

interface Role {
  id: string;
  name: string;
}

interface UserListItem {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  role: { id: string; name: string } | null;
}

/** Docentes activos disponibles para asignar a un estudiante. */
export function useTeacherOptions() {
  return useQuery({
    queryKey: ['users', 'teacher-options'],
    queryFn: async () => {
      const roles = await apiFetch<Role[]>('/roles');
      const teacherRole = roles.find((role) => role.name === 'Docente');
      if (!teacherRole) return [];

      const users = await apiFetch<PaginatedResponse<UserListItem>>(
        `/users?role=${teacherRole.id}&pageSize=100`,
      );
      return users.data.filter((user) => user.isActive);
    },
  });
}
