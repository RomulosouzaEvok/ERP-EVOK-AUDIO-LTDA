import { ClipboardCheck } from 'lucide-react';

import { WidgetCard } from '@/pages/home/WidgetCard';
import { useHandoffs } from '@/pages/home/useHandoffs';

/** Widget `requisicoes-aprovacao` — fila de requisições de compra aguardando aprovação (UC-40). */
export function RequisicoesAprovacaoWidget() {
  const { data, isLoading, isError } = useHandoffs();
  const awaiting = data?.requisicoes?.awaiting_approval ?? 0;

  return (
    <WidgetCard
      icon={ClipboardCheck}
      title="Requisições aguardando aprovação"
      to="/purchases/requisitions"
      actionLabel="Ver fila de aprovação"
      isLoading={isLoading}
      isError={isError}
      errorTitle='Não foi possível carregar o resumo de "Requisições aguardando aprovação"'
    >
      <p className={`text-3xl font-semibold tabular-nums ${awaiting > 0 ? 'text-amber-600' : ''}`}>{awaiting}</p>
      <p className="text-xs text-muted-foreground">
        {awaiting > 0 ? 'Requisição(ões) parada(s) aguardando sua aprovação.' : 'Nenhuma requisição pendente de aprovação.'}
      </p>
    </WidgetCard>
  );
}
