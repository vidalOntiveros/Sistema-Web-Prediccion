export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /** false para chequeos de sesión donde un 401 es una respuesta normal, no una sesión expirada (p. ej. /auth/me al montar la app). */
  redirectOn401?: boolean;
}

/**
 * Único punto de acceso del cliente a la API: pasa siempre por
 * /app/api/proxy/[...path] (patrón BFF, ver docs/08-diseno-frontend.md §1).
 * Nunca llamar a NEST_API_URL directo desde un Client Component.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`/api/proxy/${path.replace(/^\//, '')}`, {
    method: options.method ?? 'GET',
    headers: options.body && !isFormData ? { 'Content-Type': 'application/json' } : undefined,
    body: isFormData ? (options.body as FormData) : options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  if (res.status === 401 && options.redirectOn401 !== false && typeof window !== 'undefined') {
    window.location.href = '/login';
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const body = data as ApiErrorBody | null;
    throw new ApiError(
      res.status,
      body?.error ?? 'UNKNOWN_ERROR',
      body?.message ?? 'Error inesperado del servidor.',
      body?.details,
    );
  }

  return data as T;
}
