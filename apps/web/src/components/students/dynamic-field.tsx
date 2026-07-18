'use client';

import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
  type UseFormRegister,
} from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DatasetColumn } from '@/hooks/use-dataset-columns';

interface DynamicFieldProps<TFieldValues extends FieldValues> {
  column: DatasetColumn;
  register: UseFormRegister<TFieldValues>;
  control: Control<TFieldValues>;
  error?: string;
}

export function DynamicField<TFieldValues extends FieldValues>({
  column,
  register,
  control,
  error,
}: DynamicFieldProps<TFieldValues>) {
  const name = `extraData.${column.key}` as Path<TFieldValues>;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>
        {column.label}
        {column.required ? ' *' : ''}
      </Label>

      {column.dataType === 'boolean' ? (
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Checkbox
              id={name}
              checked={!!field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      ) : (
        <Input
          id={name}
          type={
            column.dataType === 'number' ? 'number' : column.dataType === 'date' ? 'date' : 'text'
          }
          step={column.dataType === 'number' ? 'any' : undefined}
          {...register(name, column.dataType === 'number' ? { valueAsNumber: true } : {})}
        />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
