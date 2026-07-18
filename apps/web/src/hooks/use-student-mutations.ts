'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { StudentDetail } from './use-students';

export interface StudentCoreInput {
  controlNumber?: string;
  fullName?: string;
  career?: string;
  semester?: number;
  status?: string;
  extraData?: Record<string, unknown>;
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StudentCoreInput) =>
      apiFetch<StudentDetail>('/students', { method: 'POST', body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useUpdateStudent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StudentCoreInput) =>
      apiFetch<StudentDetail>(`/students/${id}`, { method: 'PATCH', body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useAddTeachers(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (teacherIds: string[]) =>
      apiFetch<StudentDetail>(`/students/${studentId}/teachers`, {
        method: 'POST',
        body: { teacherIds },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['students', studentId] });
    },
  });
}

export function useRemoveTeacher(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (teacherId: string) =>
      apiFetch<void>(`/students/${studentId}/teachers/${teacherId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['students', studentId] });
    },
  });
}
