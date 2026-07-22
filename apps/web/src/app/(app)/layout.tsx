'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Can } from '@/components/shared/can';
import { useAuth } from '@/hooks/use-auth';

// Placeholder mínimo para navegar entre pantallas — el AppShell/RoleNav real es
// trabajo de Fase 5 (docs/estado-proyecto.md).
export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return <div className="flex flex-1 items-center justify-center p-8">Cargando…</div>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b p-4">
        <nav className="flex items-center gap-4 text-sm">
          <Can permission="dashboard:read">
            <Link href="/dashboard">Dashboard</Link>
          </Can>
          <Can permission={['students:read:all', 'students:read:own']}>
            <Link href="/students">Estudiantes</Link>
          </Can>
          <Can permission="datasets:read">
            <Link href="/dataset-uploads">Cargas</Link>
          </Can>
          <Can permission={['predictions:read:all', 'predictions:read:own']}>
            <Link href="/predictions">Predicciones</Link>
          </Can>
        </nav>
        <div className="flex items-center gap-3">
          <span className="font-medium">{user?.fullName}</span>
          <Button variant="outline" size="sm" onClick={() => logout()}>
            Cerrar sesión
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
