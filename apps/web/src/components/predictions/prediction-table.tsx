'use client';

import { useRouter } from 'next/navigation';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { RiskBadge } from '@/components/predictions/risk-badge';
import type { PredictionFilters, PredictionListItem } from '@/hooks/use-predictions';
import { usePredictions } from '@/hooks/use-predictions';

const columns: DataTableColumn<PredictionListItem>[] = [
  { key: 'studentName', header: 'Estudiante', render: (p) => p.studentName },
  {
    key: 'riskLevel',
    header: 'Riesgo',
    render: (p) => <RiskBadge riskLevel={p.riskLevel} />,
  },
  { key: 'score', header: 'Score', render: (p) => `${(p.score * 100).toFixed(0)}%` },
  { key: 'modelVersion', header: 'Modelo', render: (p) => p.modelVersion },
  {
    key: 'createdAt',
    header: 'Fecha',
    render: (p) => new Date(p.createdAt).toLocaleString('es-MX'),
  },
];

export function PredictionTable({
  filters,
  onPageChange,
}: {
  filters: PredictionFilters;
  onPageChange: (page: number) => void;
}) {
  const router = useRouter();
  const { data, isLoading } = usePredictions(filters);

  return (
    <DataTable
      columns={columns}
      response={data}
      isLoading={isLoading}
      emptyMessage="No hay predicciones que coincidan con los filtros."
      onPageChange={onPageChange}
      rowKey={(p) => p.id}
      onRowClick={(p) => router.push(`/predictions/${p.id}`)}
    />
  );
}
