'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, PaginatedResponse } from '@/lib/api-client';

export interface TopFactor {
  feature: string;
  contribution: number;
}

export interface Recommendation {
  title: string;
  description: string;
}

export interface PredictionListItem {
  id: string;
  studentId: string;
  studentName: string;
  riskLevel: string;
  score: number;
  modelVersion: string;
  createdAt: string;
}

export interface PredictionDetail {
  id: string;
  studentId: string;
  executedBy: string;
  modelVersion: string;
  riskLevel: string;
  score: number;
  topFactors: TopFactor[];
  recommendations: Recommendation[];
  createdAt: string;
}

export interface PredictionFilters {
  page: number;
  pageSize?: number;
  studentId?: string;
  career?: string;
  riskLevel?: string;
  dateFrom?: string;
  dateTo?: string;
}

function buildQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  return search.toString();
}

export function usePredictions(filters: PredictionFilters) {
  return useQuery({
    queryKey: ['predictions', filters],
    queryFn: () =>
      apiFetch<PaginatedResponse<PredictionListItem>>(`/predictions?${buildQuery(filters)}`),
  });
}

export function usePrediction(id: string) {
  return useQuery({
    queryKey: ['predictions', id],
    queryFn: () => apiFetch<PredictionDetail>(`/predictions/${id}`),
    enabled: !!id,
  });
}

export function useRunPrediction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) =>
      apiFetch<PredictionDetail>('/predictions', {
        method: 'POST',
        body: { studentId },
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['predictions'] });
      void queryClient.invalidateQueries({ queryKey: ['students', result.studentId] });
    },
  });
}
