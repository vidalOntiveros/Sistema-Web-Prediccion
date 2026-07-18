'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Can } from '@/components/shared/can';
import { ErrorState } from '@/components/shared/error-state';
import { RiskBadge } from '@/components/predictions/risk-badge';
import { StudentForm } from '@/components/students/student-form';
import { useStudent } from '@/hooks/use-students';
import { useAddTeachers, useRemoveTeacher } from '@/hooks/use-student-mutations';
import { useTeacherOptions } from '@/hooks/use-teacher-options';

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: student, isLoading, error } = useStudent(params.id);
  const [editing, setEditing] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  const { data: teacherOptions } = useTeacherOptions();
  const addTeachers = useAddTeachers(params.id);
  const removeTeacher = useRemoveTeacher(params.id);

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  if (error || !student) return <ErrorState error={error} />;

  if (editing) {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        <h1 className="text-lg font-medium">Editar estudiante</h1>
        <StudentForm mode="edit" student={student} />
        <Button variant="ghost" className="w-fit" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
      </div>
    );
  }

  const assignedTeacherIds = new Set(student.teachers.map((t) => t.id));
  const availableTeachers = (teacherOptions ?? []).filter(
    (teacher) => !assignedTeacherIds.has(teacher.id),
  );

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium">{student.fullName}</h1>
          <p className="text-sm text-muted-foreground">
            {student.controlNumber} — {student.career}, semestre {student.semester}
          </p>
        </div>
        <Can permission="students:write">
          <Button variant="outline" onClick={() => setEditing(true)}>
            Editar
          </Button>
        </Can>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant={student.status === 'active' ? 'default' : 'outline'}>
          {student.status === 'active' ? 'Activo' : 'Inactivo'}
        </Badge>
        {student.latestPrediction && <RiskBadge riskLevel={student.latestPrediction.riskLevel} />}
      </div>

      {Object.keys(student.extraData).length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Datos adicionales</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {Object.entries(student.extraData).map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="text-muted-foreground">{key}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Docentes asignados</h2>
        {student.teachers.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin docentes asignados.</p>
        )}
        <ul className="flex flex-col gap-2">
          {student.teachers.map((teacher) => (
            <li key={teacher.id} className="flex items-center justify-between text-sm">
              <span>{teacher.fullName}</span>
              <Can permission="students:write">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={removeTeacher.isPending}
                  onClick={() => removeTeacher.mutate(teacher.id)}
                >
                  Quitar
                </Button>
              </Can>
            </li>
          ))}
        </ul>

        <Can permission="students:write">
          <div className="flex items-center gap-2">
            <Select
              value={selectedTeacherId}
              onValueChange={(value) => setSelectedTeacherId(value ?? '')}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Elegir docente…" />
              </SelectTrigger>
              <SelectContent>
                {availableTeachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!selectedTeacherId || addTeachers.isPending}
              onClick={() => {
                addTeachers.mutate([selectedTeacherId]);
                setSelectedTeacherId('');
              }}
            >
              Asignar
            </Button>
          </div>
        </Can>
      </div>
    </div>
  );
}
