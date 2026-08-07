import { useQuery } from '@tanstack/react-query';
import { HardHat } from 'lucide-react';

import * as sstApi from '@/api/sst';
import { WidgetCard } from '@/pages/home/WidgetCard';

/**
 * Widget `sst-pendencias` — ASOs a vencer (30 dias) + entregas de EPI
 * confirmadas pendentes de evidência/confirmação, consumindo diretamente
 * `GET /api/sst/aso/upcoming` e `GET /api/sst/epi-deliveries/pending-report`
 * (não há endpoint agregado de handoffs para SST ainda — diferente dos
 * demais widgets desta página, que reaproveitam `GET /api/dashboard/handoffs`).
 */
export function SstPendenciasWidget() {
  const {
    data: upcomingAso,
    isLoading: isAsoLoading,
    isError: isAsoError,
  } = useQuery({
    queryKey: ['sst-aso-upcoming'],
    queryFn: sstApi.listAsoUpcoming,
  });

  const {
    data: pendingEpi,
    isLoading: isEpiLoading,
    isError: isEpiError,
  } = useQuery({
    queryKey: ['sst-epi-pending-report'],
    queryFn: sstApi.getEpiPendingReport,
  });

  const asoDueIn30 = upcomingAso?.filter((entry) => entry.dias_restantes <= 30).length ?? 0;
  const pendingEpiCount = pendingEpi?.length ?? 0;
  const total = asoDueIn30 + pendingEpiCount;

  return (
    <WidgetCard
      icon={HardHat}
      title="Pendências de SST"
      to="/sst"
      actionLabel="Ir para SST"
      isLoading={isAsoLoading || isEpiLoading}
      isError={isAsoError || isEpiError}
      errorTitle='Não foi possível carregar o resumo de "Pendências de SST"'
    >
      <div className="flex items-baseline gap-2">
        <p className={`text-3xl font-semibold tabular-nums ${total > 0 ? 'text-destructive' : ''}`}>{total}</p>
        <span className="text-xs text-muted-foreground">no total</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {asoDueIn30} ASO(s) vencendo em 30 dias · {pendingEpiCount} pendência(s) crítica(s) de EPI
      </p>
    </WidgetCard>
  );
}
