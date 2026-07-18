'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDatasetColumns } from '@/hooks/use-dataset-columns';
import { useCreateStudent, useUpdateStudent } from '@/hooks/use-student-mutations';
import type { StudentDetail } from '@/hooks/use-students';
import { ApiError } from '@/lib/api-client';
import { studentFormSchema, type StudentFormValues } from '@/lib/validation/student-core-schema';
import { DynamicField } from './dynamic-field';

interface StudentFormProps {
  mode: 'create' | 'edit';
  student?: StudentDetail;
}

export function StudentForm({ mode, student }: StudentFormProps) {
  const router = useRouter();
  const { data: columns, isLoading: columnsLoading } = useDatasetColumns();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent(student?.id ?? '');
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      controlNumber: student?.controlNumber ?? '',
      fullName: student?.fullName ?? '',
      career: student?.career ?? '',
      semester: student?.semester ?? 1,
      extraData: student?.extraData ?? {},
    },
  });

  async function onSubmit(values: StudentFormValues) {
    setFormError(null);
    try {
      if (mode === 'create') {
        const created = await createStudent.mutateAsync(values);
        router.push(`/students/${created.id}`);
        return;
      }

      if (student) {
        await updateStudent.mutateAsync({
          fullName: values.fullName,
          career: values.career,
          semester: values.semester,
          extraData: values.extraData,
        });
        router.push(`/students/${student.id}`);
      }
    } catch (error) {
      if (error instanceof ApiError && error.errorCode === 'EXTRA_DATA_VALIDATION_FAILED') {
        const details = error.details as { field: string; issue: string }[];
        for (const detail of details) {
          // Nombre de campo genuinamente dinámico (viene del catálogo) — no hay
          // forma de tipar esto estáticamente contra Path<StudentFormValues>.
          setError(`extraData.${detail.field}` as Path<StudentFormValues>, {
            message: detail.issue,
          });
        }
        return;
      }
      setFormError(error instanceof ApiError ? error.message : 'No se pudo guardar el estudiante.');
    }
  }

  if (columnsLoading) {
    return <p className="text-sm text-muted-foreground">Cargando catálogo…</p>;
  }

  const extraDataErrors = errors.extraData as
    | Record<string, { message?: string }>
    | undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="controlNumber">Número de control</Label>
          <Input id="controlNumber" disabled={mode === 'edit'} {...register('controlNumber')} />
          {errors.controlNumber && (
            <p className="text-sm text-destructive">{errors.controlNumber.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="fullName">Nombre completo</Label>
          <Input id="fullName" {...register('fullName')} />
          {errors.fullName && (
            <p className="text-sm text-destructive">{errors.fullName.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="career">Carrera</Label>
          <Input id="career" {...register('career')} />
          {errors.career && <p className="text-sm text-destructive">{errors.career.message}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="semester">Semestre</Label>
          <Input id="semester" type="number" {...register('semester', { valueAsNumber: true })} />
          {errors.semester && (
            <p className="text-sm text-destructive">{errors.semester.message}</p>
          )}
        </div>
      </div>

      {columns && columns.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-muted-foreground">Datos adicionales</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {columns.map((column) => (
              <DynamicField
                key={column.key}
                column={column}
                register={register}
                control={control}
                error={extraDataErrors?.[column.key]?.message}
              />
            ))}
          </div>
        </div>
      )}

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-fit">
        {isSubmitting ? 'Guardando…' : mode === 'create' ? 'Crear estudiante' : 'Guardar cambios'}
      </Button>
    </form>
  );
}
