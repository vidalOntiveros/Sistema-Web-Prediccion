'use client';

import { Button } from '@/components/ui/button';
import { PredictionResultCard } from '@/components/predictions/prediction-result-card';
import { useRunPrediction } from '@/hooks/use-predictions';
import { ApiError } from '@/lib/api-client';

export function RunPredictionButton({ studentId }: { studentId: string }) {
  const runPrediction = useRunPrediction();

  return (
    <div className="flex flex-col gap-3">
      <Button
        className="w-fit"
        disabled={runPrediction.isPending}
        onClick={() => runPrediction.mutate(studentId)}
      >
        {runPrediction.isPending ? 'Ejecutando…' : 'Ejecutar predicción'}
      </Button>

      {runPrediction.isError && (
        <p className="text-sm text-destructive">
          {runPrediction.error instanceof ApiError
            ? runPrediction.error.message
            : 'No se pudo ejecutar la predicción.'}
        </p>
      )}

      {runPrediction.isSuccess && <PredictionResultCard prediction={runPrediction.data} />}
    </div>
  );
}
