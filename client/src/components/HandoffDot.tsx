import { cn } from '@/lib/utils';

/** Cor do semáforo de handoff (UC-40, `BUSINESS_RULES.md` §10) — espelha `HandoffSignal` do backend. */
export type HandoffSignal = 'green' | 'yellow' | 'red';

const SIGNAL_META: Record<HandoffSignal, { className: string; label: string }> = {
  green: { className: 'bg-emerald-500', label: 'No fluxo / a caminho — sem pendência de ação.' },
  yellow: { className: 'bg-amber-500', label: 'Aguardando ação — handoff aberto para o próximo setor.' },
  red: { className: 'bg-red-600', label: 'Atrasado / problema — requer atenção imediata.' },
};

/**
 * Bolinha de semáforo (UC-40) usada como primeira coluna das filas de
 * handoff entre departamentos (Recebimento, Requisições, Expedição,
 * Qualidade/RNC). Cor calculada pelo backend (`handoff_signal`, nunca
 * persistida) — este componente é puramente de apresentação.
 *
 * `title`/`aria-label` explicam o significado da cor (nunca apenas a cor
 * crua) para o operador, conforme o padrão didático do projeto.
 */
export function HandoffDot({ signal, className }: { signal: HandoffSignal; className?: string }) {
  const meta = SIGNAL_META[signal];
  return (
    <span
      role="img"
      aria-label={meta.label}
      title={meta.label}
      className={cn('inline-block size-2.5 shrink-0 rounded-full', meta.className, className)}
    />
  );
}
