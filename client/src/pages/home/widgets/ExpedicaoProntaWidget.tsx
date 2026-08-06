import { Truck } from 'lucide-react';

import { WidgetCard } from '@/pages/home/WidgetCard';
import { useHandoffs } from '@/pages/home/useHandoffs';

/** Widget `expedicao-pronta` — contador de vendas prontas para expedição (UC-40). */
export function ExpedicaoProntaWidget() {
  const { data, isLoading, isError } = useHandoffs();
  const ready = data?.expedicao?.ready_to_ship ?? 0;

  return (
    <WidgetCard
      icon={Truck}
      title="Pronto para expedição"
      to="/logistics/expedicao"
      actionLabel="Ir para expedição"
      isLoading={isLoading}
      isError={isError}
      errorTitle='Não foi possível carregar o resumo de "Pronto para expedição"'
    >
      <p className={`text-3xl font-semibold tabular-nums ${ready > 0 ? 'text-brand' : ''}`}>{ready}</p>
      <p className="text-xs text-muted-foreground">
        {ready > 0 ? 'Venda(s) liberada(s) aguardando expedição.' : 'Nenhuma venda aguardando expedição.'}
      </p>
    </WidgetCard>
  );
}
