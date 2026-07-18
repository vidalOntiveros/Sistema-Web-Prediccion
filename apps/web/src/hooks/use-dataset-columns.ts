'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface DatasetColumn {
  id: string;
  key: string;
  label: string;
  dataType: 'string' | 'number' | 'boolean' | 'date';
  required: boolean;
  displayOrder: number;
}

export function useDatasetColumns() {
  return useQuery({
    queryKey: ['dataset-columns'],
    queryFn: () => apiFetch<DatasetColumn[]>('/dataset-columns'),
  });
}
