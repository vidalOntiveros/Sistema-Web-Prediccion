'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Can } from '@/components/shared/can';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import type { DatasetUploadFilters, DatasetUploadListItem } from '@/hooks/use-dataset-uploads';
import { useDatasetUploads } from '@/hooks/use-dataset-uploads';

const STATUS_LABEL: Record<string, string> = {
  completed: 'Completada',
  failed: 'Fallida',
  processing: 'Procesando',
};

const columns: DataTableColumn<DatasetUploadListItem>[] = [
  { key: 'fileName', header: 'Archivo', render: (u) => u.fileName },
  {
    key: 'status',
    header: 'Estatus',
    render: (u) => (
      <Badge variant={u.status === 'failed' ? 'destructive' : 'default'}>
        {STATUS_LABEL[u.status] ?? u.status}
      </Badge>
    ),
  },
  { key: 'totalRows', header: 'Filas', render: (u) => u.totalRows },
  { key: 'createdCount', header: 'Creados', render: (u) => u.createdCount },
  { key: 'updatedCount', header: 'Actualizados', render: (u) => u.updatedCount },
  { key: 'errorRows', header: 'Filas con error', render: (u) => u.errorRows },
  { key: 'uploadedBy', header: 'Subido por', render: (u) => u.uploadedBy.fullName },
  {
    key: 'createdAt',
    header: 'Fecha',
    render: (u) => new Date(u.createdAt).toLocaleString('es-MX'),
  },
];

export default function DatasetUploadsPage() {
  const [filters, setFilters] = useState<DatasetUploadFilters>({ page: 1, pageSize: 20 });
  const { data, isLoading } = useDatasetUploads(filters);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Historial de cargas</h1>
        <Can permission="datasets:upload">
          <Link href="/dataset-uploads/new" className={buttonVariants()}>
            Nueva carga
          </Link>
        </Can>
      </div>

      <DataTable
        columns={columns}
        response={data}
        isLoading={isLoading}
        emptyMessage="Todavía no se ha subido ningún dataset."
        onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
        rowKey={(u) => u.id}
      />
    </div>
  );
}
