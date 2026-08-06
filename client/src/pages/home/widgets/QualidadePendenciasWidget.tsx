import { ShieldAlert } from 'lucide-react';

import { WidgetCard } from '@/pages/home/WidgetCard';
import { useHandoffs } from '@/pages/home/useHandoffs';

/** Widget `qualidade-pendencias` — itens em quarentena + RNCs abertas (UC-40). */
export function QualidadePendenciasWidget() {
  const { data, isLoading, isError } = useHandoffs();
  const quarantine = data?.qualidade?.quarantine ?? 0;
  const openRncs = data?.qualidade?.open_rncs ?? 0;
  const total = quarantine + openRncs;

  return (
    <WidgetCard
      icon={ShieldAlert}
      title="Pendências de qualidade"
      to="/quality"
      actionLabel="Ir para qualidade"
      isLoading={isLoading}
      isError={isError}
      errorTitle='Não foi possível carregar o resumo de "Pendências de qualidade"'
    >
      <div className="flex items-baseline gap-2">
        <p className={`text-3xl font-semibold tabular-nums ${total > 0 ? 'text-destructive' : ''}`}>{total}</p>
        <span className="text-xs text-muted-foreground">no total</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {quarantine} em quarentena · {openRncs} RNC(s) aberta(s)
      </p>
    </WidgetCard>
  );
}
