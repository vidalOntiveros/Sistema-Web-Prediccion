'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import type { StudentFilters, StudentListItem } from '@/hooks/use-students';
import { useStudents } from '@/hooks/use-students';

const columns: DataTableColumn<StudentListItem>[] = [
  { key: 'controlNumber', header: 'No. control', render: (s) => s.controlNumber },
  { key: 'fullName', header: 'Nombre', render: (s) => s.fullName },
  { key: 'career', header: 'Carrera', render: (s) => s.career },
  { key: 'semester', header: 'Semestre', render: (s) => s.semester },
  {
    key: 'status',
    header: 'Estatus',
    render: (s) => (
      <Badge variant={s.status === 'active' ? 'default' : 'outline'}>
        {s.status === 'active' ? 'Activo' : 'Inactivo'}
      </Badge>
    ),
  },
  { key: 'teacherCount', header: 'Docentes', render: (s) => s.teacherCount },
];

export function StudentTable({
  filters,
  onPageChange,
}: {
  filters: StudentFilters;
  onPageChange: (page: number) => void;
}) {
  const router = useRouter();
  const { data, isLoading } = useStudents(filters);

  return (
    <DataTable
      columns={columns}
      response={data}
      isLoading={isLoading}
      emptyMessage="No hay estudiantes que coincidan con los filtros."
      onPageChange={onPageChange}
      rowKey={(s) => s.id}
      onRowClick={(s) => router.push(`/students/${s.id}`)}
    />
  );
}
