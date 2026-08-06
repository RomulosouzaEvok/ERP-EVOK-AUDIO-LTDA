import type { ComponentType, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Caixa de aviso âmbar (atenção/informativo, não bloqueante) — padrão visual
 * repetido em vários formulários (amostra de engenharia, teste fora de
 * especificação, recebimento em quarentena). Centraliza a paleta e o dark
 * mode num único lugar (antes replicados manualmente em ~6 arquivos, um
 * deles sem variante dark).
 */
export function AmberNoticeBox({
  children,
  icon: Icon,
  size = 'sm',
  className,
}: {
  children: ReactNode;
  /** Ícone opcional (ex.: `AlertTriangle`, `ShieldAlert`) alinhado ao topo do texto. */
  icon?: ComponentType<{ className?: string }>;
  /** `xs` para notas curtas de rodapé de formulário; `sm` (padrão) para avisos com mais texto. */
  size?: 'xs' | 'sm';
  className?: string;
}) {
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
        size === 'xs' ? 'text-xs' : 'text-sm',
        className,
      )}
    >
      {Icon && <Icon className="mt-0.5 size-4 shrink-0" />}
      <div className="flex-1">{children}</div>
    </div>
  );
}
