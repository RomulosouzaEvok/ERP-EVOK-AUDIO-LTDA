import { PackageSearch } from 'lucide-react';

import { WidgetCard } from '@/pages/home/WidgetCard';
import { useHandoffs } from '@/pages/home/useHandoffs';

/** Widget `recebimento-pendente` — contador de recebimentos aguardando conferência (UC-40). */
export function RecebimentoPendenteWidget() {
  const { data, isLoading, isError } = useHandoffs();
  const pending = data?.recebimento?.pending ?? 0;

  return (
    <WidgetCard
      icon={PackageSearch}
      title="Recebimento pendente"
      to="/logistics/recebimento"
      actionLabel="Ir para recebimento"
      isLoading={isLoading}
      isError={isError}
      errorTitle='Não foi possível carregar o resumo de "Recebimento pendente"'
    >
      <p className={`text-3xl font-semibold tabular-nums ${pending > 0 ? 'text-destructive' : ''}`}>{pending}</p>
      <p className="text-xs text-muted-foreground">
        {pending > 0 ? 'Nota(s) fiscal(is) aguardando conferência.' : 'Nenhum recebimento pendente no momento.'}
      </p>
    </WidgetCard>
  );
}
