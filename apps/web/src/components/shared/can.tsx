'use client';

import type { ReactNode } from 'react';
import { useHasPermission } from '@/hooks/use-has-permission';

export function Can({
  permission,
  children,
}: {
  permission: string | string[];
  children: ReactNode;
}) {
  const permissions = Array.isArray(permission) ? permission : [permission];
  const allowed = useHasPermission(...permissions);
  return allowed ? <>{children}</> : null;
}
