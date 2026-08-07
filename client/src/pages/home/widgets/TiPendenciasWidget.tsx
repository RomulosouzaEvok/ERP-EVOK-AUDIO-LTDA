import { useQuery } from '@tanstack/react-query';
import { Server } from 'lucide-react';

import * as tiApi from '@/api/ti';
import { WidgetCard } from '@/pages/home/WidgetCard';

/**
 * Widget `ti-pendencias` — chamados abertos na fila + licenças vencendo em
 * 30 dias + solicitações de acesso pendentes, consumindo
 * `GET /api/ti/tickets` (status `open`), `GET /api/ti/licenses/expiring` e
 * `GET /api/ti/access-requests` (status `pending`). Só aparece para quem tem
 * o módulo `ti` (gestão) — não deve ser confundido com o widget de "meus
 * chamados" de auto-serviço.
 */
export function TiPendenciasWidget() {
  const {
    data: openTickets,
    isLoading: isTicketsLoading,
    isError: isTicketsError,
  } = useQuery({
    queryKey: ['ti-widget-open-tickets'],
    queryFn: () => tiApi.listTickets({ status: 'open', limit: 1 }),
  });

  const {
    data: expiringLicenses,
    isLoading: isLicensesLoading,
    isError: isLicensesError,
  } = useQuery({
    queryKey: ['ti-widget-expiring-licenses'],
    queryFn: tiApi.listExpiringLicenses,
  });

  const {
    data: pendingAccessRequests,
    isLoading: isAccessLoading,
    isError: isAccessError,
  } = useQuery({
    queryKey: ['ti-widget-pending-access-requests'],
    queryFn: () => tiApi.listAccessRequests({ status: 'pending', limit: 1 }),
  });

  const openTicketsCount = openTickets?.pagination.total ?? 0;
  const expiringLicensesCount = expiringLicenses?.length ?? 0;
  const pendingAccessCount = pendingAccessRequests?.pagination.total ?? 0;
  const total = openTicketsCount + expiringLicensesCount + pendingAccessCount;
  const isLoading = isTicketsLoading || isLicensesLoading || isAccessLoading;
  const isError = isTicketsError || isLicensesError || isAccessError;

  return (
    <WidgetCard
      icon={Server}
      title="Pendências de TI"
      to="/ti"
      actionLabel="Ir para TI"
      isLoading={isLoading}
      isError={isError}
      errorTitle='Não foi possível carregar o resumo de "Pendências de TI"'
    >
      <div className="flex items-baseline gap-2">
        <p className={`text-3xl font-semibold tabular-nums ${total > 0 ? 'text-destructive' : ''}`}>{total}</p>
        <span className="text-xs text-muted-foreground">no total</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {openTicketsCount} chamado(s) aberto(s) · {expiringLicensesCount} licença(s) vencendo · {pendingAccessCount} acesso(s) pendente(s)
      </p>
    </WidgetCard>
  );
}
