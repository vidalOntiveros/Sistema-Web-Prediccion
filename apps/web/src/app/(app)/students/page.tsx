'use client';

import Link from 'next/link';
import { useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Can } from '@/components/shared/can';
import { StudentTable } from '@/components/students/student-table';
import type { StudentFilters } from '@/hooks/use-students';

export default function StudentsPage() {
  const [filters, setFilters] = useState<StudentFilters>({ page: 1, pageSize: 20 });

  function updateFilter(patch: Partial<StudentFilters>) {
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Estudiantes</h1>
        <Can permission="students:write">
          <Link href="/students/new" className={buttonVariants()}>
            Nuevo estudiante
          </Link>
        </Can>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por nombre o no. control"
          className="max-w-xs"
          onChange={(e) => updateFilter({ search: e.target.value || undefined })}
        />
        <Input
          placeholder="Carrera"
          className="max-w-40"
          onChange={(e) => updateFilter({ career: e.target.value || undefined })}
        />
        <Input
          placeholder="Semestre"
          type="number"
          className="max-w-32"
          onChange={(e) =>
            updateFilter({ semester: e.target.value ? Number(e.target.value) : undefined })
          }
        />
      </div>

      <StudentTable filters={filters} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />
    </div>
  );
}
