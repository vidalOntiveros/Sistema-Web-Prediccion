import { ApiError } from '@/lib/api-client';

export function ErrorState({ error }: { error: unknown }) {
  if (error instanceof ApiError && error.statusCode === 403) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-destructive">
        No tienes permiso para ver esto.
      </div>
    );
  }

  if (error instanceof ApiError && error.statusCode === 404) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No se encontró lo que buscabas.
      </div>
    );
  }

  const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-destructive">
      {message}
    </div>
  );
}
