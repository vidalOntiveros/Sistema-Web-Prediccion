'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PredictionTable } from '@/components/predictions/prediction-table';
import type { PredictionFilters } from '@/hooks/use-predictions';

export default function PredictionsPage() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<PredictionFilters>({
    page: 1,
    pageSize: 20,
    studentId: searchParams.get('studentId') ?? undefined,
  });

  function updateFilter(patch: Partial<PredictionFilters>) {
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }));
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-medium">Historial de predicciones</h1>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Carrera"
          className="max-w-40"
          onChange={(e) => updateFilter({ career: e.target.value || undefined })}
        />
        <Select
          value={filters.riskLevel ?? 'all'}
          onValueChange={(value: string | null) =>
            updateFilter({ riskLevel: value && value !== 'all' ? value : undefined })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Nivel de riesgo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los niveles</SelectItem>
            <SelectItem value="low">Bajo</SelectItem>
            <SelectItem value="medium">Medio</SelectItem>
            <SelectItem value="high">Alto</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          className="max-w-40"
          onChange={(e) => updateFilter({ dateFrom: e.target.value || undefined })}
        />
        <Input
          type="date"
          className="max-w-40"
          onChange={(e) => updateFilter({ dateTo: e.target.value || undefined })}
        />
      </div>

      <PredictionTable filters={filters} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />
    </div>
  );
}
