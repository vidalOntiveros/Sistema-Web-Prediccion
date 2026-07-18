import { StudentForm } from '@/components/students/student-form';

export default function NewStudentPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-lg font-medium">Nuevo estudiante</h1>
      <StudentForm mode="create" />
    </div>
  );
}
