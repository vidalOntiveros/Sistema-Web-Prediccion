'use client';

import { useAuth } from './use-auth';

export function useHasPermission(...permissions: string[]) {
  const { user } = useAuth();
  if (!user) return false;
  return permissions.some((permission) => user.permissions.includes(permission));
}
