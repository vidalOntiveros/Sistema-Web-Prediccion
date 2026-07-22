'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ErrorState } from '@/components/shared/error-state';
import { PredictionResultCard } from '@/components/predictions/prediction-result-card';
import { usePrediction } from '@/hooks/use-predictions';
import { useStudent } from '@/hooks/use-students';

export default function PredictionDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: prediction, isLoading, error } = usePrediction(params.id);
  const { data: student } = useStudent(prediction?.studentId ?? '');

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  if (error || !prediction) return <ErrorState error={error} />;

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-lg font-medium">Predicción</h1>
        <Link
          href={`/students/${prediction.studentId}`}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {student ? student.fullName : 'Ver estudiante'}
        </Link>
      </div>

      <PredictionResultCard prediction={prediction} />
    </div>
  );
}
