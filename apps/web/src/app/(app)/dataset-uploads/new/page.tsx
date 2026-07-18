'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUploadDataset } from '@/hooks/use-dataset-uploads';
import { ApiError } from '@/lib/api-client';

interface RowError {
  row: number;
  field: string;
  issue: string;
}

export default function NewDatasetUploadPage() {
  const router = useRouter();
  const upload = useUploadDataset();
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<RowError[] | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setErrors(null);
    setGeneralError(null);

    try {
      const result = await upload.mutateAsync(file);
      router.push(`/dataset-uploads/${result.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.errorCode === 'DATASET_VALIDATION_FAILED') {
        setErrors(error.details as RowError[]);
        setGeneralError(error.message);
        return;
      }
      setGeneralError(error instanceof ApiError ? error.message : 'No se pudo subir el archivo.');
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-lg font-medium">Nueva carga de estudiantes</h1>
      <p className="text-sm text-muted-foreground">
        Archivo .csv o .xlsx con columnas <code>numero_control</code>, <code>nombre</code>,{' '}
        <code>carrera</code>, <code>semestre</code> y las columnas del catálogo activo.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <Button type="submit" disabled={!file || upload.isPending} className="w-fit">
          {upload.isPending ? 'Subiendo…' : 'Subir'}
        </Button>
      </form>

      {generalError && <p className="text-sm text-destructive">{generalError}</p>}

      {errors && errors.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-destructive">Errores encontrados</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fila</TableHead>
                <TableHead>Columna</TableHead>
                <TableHead>Problema</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errors.map((error, index) => (
                <TableRow key={index}>
                  <TableCell>{error.row}</TableCell>
                  <TableCell>{error.field}</TableCell>
                  <TableCell>{error.issue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
