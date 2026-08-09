import { useQuery } from '@tanstack/react-query';
import { Scale } from 'lucide-react';

import * as jurApi from '@/api/juridico';
import { WidgetCard } from '@/pages/home/WidgetCard';

/**
 * Widget `juridico-pendencias` — prazos fatais críticos (`missed` +
 * `pending` vencendo em ≤3 dias, `GET /api/jur/legal-case-deadlines/critical`)
 * + alertas pendentes (`GET /api/jur/alerts?status=pending`). Só aparece
 * para quem tem o módulo `juridico` (gestão) — visão de gestão, não de
 * auto-serviço (não existe auto-serviço neste módulo, diferente de TI).
 */
export function JuridicoPendenciasWidget() {
  const {
    data: criticalDeadlines,
    isLoading: isDeadlinesLoading,
    isError: isDeadlinesError,
  } = useQuery({
    queryKey: ['jur-widget-critical-deadlines'],
    queryFn: jurApi.listCriticalDeadlines,
  });

  const {
    data: pendingAlerts,
    isLoading: isAlertsLoading,
    isError: isAlertsError,
  } = useQuery({
    queryKey: ['jur-widget-pending-alerts'],
    queryFn: () => jurApi.listAlerts({ status: 'pending', limit: 1 }),
  });

  const criticalCount = criticalDeadlines?.length ?? 0;
  const pendingAlertsCount = pendingAlerts?.pagination.total ?? 0;
  const total = criticalCount + pendingAlertsCount;
  const isLoading = isDeadlinesLoading || isAlertsLoading;
  const isError = isDeadlinesError || isAlertsError;

  return (
    <WidgetCard
      icon={Scale}
      title="Pendências de Jurídico"
      to="/juridico"
      actionLabel="Ir para Jurídico"
      isLoading={isLoading}
      isError={isError}
      errorTitle='Não foi possível carregar o resumo de "Pendências de Jurídico"'
    >
      <div className="flex items-baseline gap-2">
        <p className={`text-3xl font-semibold tabular-nums ${total > 0 ? 'text-destructive' : ''}`}>{total}</p>
        <span className="text-xs text-muted-foreground">no total</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {criticalCount} prazo(s) fatal(is) crítico(s) · {pendingAlertsCount} alerta(s) pendente(s)
      </p>
    </WidgetCard>
  );
}
