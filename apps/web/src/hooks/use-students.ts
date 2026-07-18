'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch, PaginatedResponse } from '@/lib/api-client';

export interface StudentListItem {
  id: string;
  controlNumber: string;
  fullName: string;
  career: string;
  semester: number;
  status: string;
  teacherCount: number;
}

export interface StudentDetail {
  id: string;
  controlNumber: string;
  fullName: string;
  career: string;
  semester: number;
  status: string;
  extraData: Record<string, unknown>;
  teachers: { id: string; fullName: string }[];
  latestPrediction: {
    id: string;
    riskLevel: string;
    score: number;
    createdAt: string;
  } | null;
}

export interface StudentFilters {
  page: number;
  pageSize?: number;
  career?: string;
  semester?: number;
  controlNumber?: string;
  status?: string;
  search?: string;
}

function buildQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  return search.toString();
}

export function useStudents(filters: StudentFilters) {
  return useQuery({
    queryKey: ['students', filters],
    queryFn: () =>
      apiFetch<PaginatedResponse<StudentListItem>>(`/students?${buildQuery(filters)}`),
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: ['students', id],
    queryFn: () => apiFetch<StudentDetail>(`/students/${id}`),
    enabled: !!id,
  });
}
