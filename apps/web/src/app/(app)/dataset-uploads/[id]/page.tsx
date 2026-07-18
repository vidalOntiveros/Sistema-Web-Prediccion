'use client';

import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ErrorState } from '@/components/shared/error-state';
import { useDatasetUpload } from '@/hooks/use-dataset-uploads';

const STATUS_LABEL: Record<string, string> = {
  completed: 'Completada',
  failed: 'Fallida',
  processing: 'Procesando',
};

export default function DatasetUploadDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: upload, isLoading, error } = useDatasetUpload(params.id);

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  if (error || !upload) return <ErrorState error={error} />;

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">{upload.fileName}</h1>
        <Badge variant={upload.status === 'failed' ? 'destructive' : 'default'}>
          {STATUS_LABEL[upload.status] ?? upload.status}
        </Badge>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Subido por</dt>
        <dd>{upload.uploadedBy.fullName}</dd>
        <dt className="text-muted-foreground">Fecha</dt>
        <dd>{new Date(upload.createdAt).toLocaleString('es-MX')}</dd>
        <dt className="text-muted-foreground">Filas totales</dt>
        <dd>{upload.totalRows}</dd>
        <dt className="text-muted-foreground">Creados</dt>
        <dd>{upload.createdCount}</dd>
        <dt className="text-muted-foreground">Actualizados</dt>
        <dd>{upload.updatedCount}</dd>
        <dt className="text-muted-foreground">Filas con error</dt>
        <dd>{upload.errorRows}</dd>
      </dl>

      {upload.status === 'failed' && upload.errors.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-destructive">Reporte de errores</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fila</TableHead>
                <TableHead>Columna</TableHead>
                <TableHead>Problema</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upload.errors.map((rowError, index) => (
                <TableRow key={index}>
                  <TableCell>{rowError.row}</TableCell>
                  <TableCell>{rowError.field}</TableCell>
                  <TableCell>{rowError.issue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
