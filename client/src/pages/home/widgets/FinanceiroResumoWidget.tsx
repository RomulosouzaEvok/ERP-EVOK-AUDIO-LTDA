import { useQuery } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';

import * as financialApi from '@/api/financial';
import { WidgetCard } from '@/pages/home/WidgetCard';

/** Widget `financeiro-resumo` — contas a pagar atrasadas (mesma query do painel executivo). */
export function FinanceiroResumoWidget() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['home-payables-overdue'],
    queryFn: () => financialApi.listPayables({ status: 'overdue', limit: 1 }),
  });

  const overdue = data?.pagination?.total ?? 0;

  return (
    <WidgetCard
      icon={Wallet}
      title="Contas a pagar atrasadas"
      to="/financial"
      actionLabel="Ir para o financeiro"
      isLoading={isLoading}
      isError={isError}
      errorTitle='Não foi possível carregar "Contas a pagar atrasadas"'
    >
      <p className={`text-3xl font-semibold tabular-nums ${overdue > 0 ? 'text-destructive' : ''}`}>{overdue}</p>
      <p className="text-xs text-muted-foreground">
        {overdue > 0 ? 'Título(s) vencido(s) sem pagamento.' : 'Nenhuma conta a pagar em atraso.'}
      </p>
    </WidgetCard>
  );
}
