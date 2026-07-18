'use client';

import { createContext, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: { id: string; name: string };
  permissions: string[];
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiFetch<AuthUser>('/auth/me', { redirectOn401: false }),
    retry: false,
  });

  async function login(email: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.message ?? 'No se pudo iniciar sesión.');
    }
    queryClient.setQueryData(['auth', 'me'], body.user);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    queryClient.setQueryData(['auth', 'me'], null);
  }

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
