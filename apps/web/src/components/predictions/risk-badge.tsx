import { Badge } from '@/components/ui/badge';

const RISK_LABEL: Record<string, string> = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
};

const RISK_CLASS: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  high: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
};

export function RiskBadge({ riskLevel }: { riskLevel: string }) {
  return (
    <Badge className={RISK_CLASS[riskLevel] ?? ''} variant="outline">
      {RISK_LABEL[riskLevel] ?? riskLevel}
    </Badge>
  );
}
