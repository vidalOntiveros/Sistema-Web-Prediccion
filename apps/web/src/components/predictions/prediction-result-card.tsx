import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RiskBadge } from '@/components/predictions/risk-badge';
import type { PredictionDetail } from '@/hooks/use-predictions';

export function PredictionResultCard({ prediction }: { prediction: PredictionDetail }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Resultado de la predicción</CardTitle>
          <RiskBadge riskLevel={prediction.riskLevel} />
        </div>
        <CardDescription>
          Score {(prediction.score * 100).toFixed(0)}% — modelo {prediction.modelVersion} —{' '}
          {new Date(prediction.createdAt).toLocaleString('es-MX')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {prediction.topFactors.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">Factores principales</h3>
            <ul className="flex flex-col gap-1 text-sm">
              {prediction.topFactors.map((factor) => (
                <li key={factor.feature} className="flex items-center justify-between">
                  <span>{factor.feature}</span>
                  <span className="text-muted-foreground">
                    {(factor.contribution * 100).toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Recomendaciones de intervención
          </h3>
          <ul className="flex flex-col gap-3 text-sm">
            {prediction.recommendations.map((recommendation, index) => (
              <li key={index} className="flex flex-col gap-0.5">
                <span className="font-medium">{recommendation.title}</span>
                <span className="text-muted-foreground">{recommendation.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
