'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, PaginatedResponse } from '@/lib/api-client';

export interface DatasetUploadListItem {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  errorRows: number;
  uploadedBy: { id: string; fullName: string };
  createdAt: string;
}

export interface DatasetUploadDetail extends DatasetUploadListItem {
  errors: { row: number; field: string; issue: string }[];
}

export interface DatasetUploadFilters {
  page: number;
  pageSize?: number;
  status?: string;
}

function buildQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  return search.toString();
}

export function useDatasetUploads(filters: DatasetUploadFilters) {
  return useQuery({
    queryKey: ['dataset-uploads', filters],
    queryFn: () =>
      apiFetch<PaginatedResponse<DatasetUploadListItem>>(
        `/dataset-uploads?${buildQuery(filters)}`,
      ),
  });
}

export function useDatasetUpload(id: string) {
  return useQuery({
    queryKey: ['dataset-uploads', id],
    queryFn: () => apiFetch<DatasetUploadDetail>(`/dataset-uploads/${id}`),
    enabled: !!id,
  });
}

export function useUploadDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiFetch<DatasetUploadListItem>('/dataset-uploads', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dataset-uploads'] });
      void queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}
