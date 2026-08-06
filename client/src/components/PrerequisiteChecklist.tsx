import { Link } from 'react-router';
import { Check, X } from 'lucide-react';

import { cn } from '@/lib/utils';

/** Item de pré-requisito verificável (Regra 1, `BUSINESS_RULES.md` §13.1). */
export interface PrerequisiteItem {
  /** Rótulo curto do pré-requisito (ex.: "BOM ativa"). */
  label: string;
  /** `true` = atendido (✓), `false` = faltando (✗). */
  ok: boolean;
  /** Motivo concreto do ✗ — obrigatório na prática quando `ok === false` (nunca texto genérico). Exibido na própria linha, nunca em tooltip. */
  detail?: string;
  /** Link opcional de "O QUE FAZER" para resolver este item específico. */
  action?: { label: string; to: string };
}

/**
 * Checklist visual de pré-requisitos (Regra 1, `docs/business/BUSINESS_RULES.md`
 * §13.1, UC-43): cada item mostra `✓ atendido` (verde) ou `✗ faltando`
 * (vermelho) com o motivo sempre visível ao lado. Não decide sozinho se o
 * botão de ação deve ser desabilitado — a tela consumidora combina
 * `items.some((i) => !i.ok)` com o `disabled` do botão, garantindo a regra
 * "botão desabilitado nunca sem motivo visível ao lado".
 */
export function PrerequisiteChecklist({ items, className }: { items: PrerequisiteItem[]; className?: string }) {
  return (
    <ul className={cn('flex flex-col gap-1.5', className)}>
      {items.map((item, index) => (
        <li
          key={index}
          className={cn(
            'flex items-start gap-2 rounded-md border p-2 text-sm',
            item.ok ? 'border-success/30 bg-success/10 text-success' : 'border-destructive/40 bg-destructive/10 text-destructive',
          )}
        >
          {item.ok ? (
            <Check className="mt-0.5 size-4 shrink-0 text-success" />
          ) : (
            <X className="mt-0.5 size-4 shrink-0 text-destructive" />
          )}
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{item.label}</span>
            {!item.ok && item.detail && <span>{item.detail}</span>}
            {!item.ok && item.action && (
              <Link to={item.action.to} className="w-fit font-medium underline underline-offset-2">
                {item.action.label}
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** `true` quando há ao menos um item `✗` — usar diretamente no `disabled` do botão de ação principal. */
export function hasPendingPrerequisite(items: PrerequisiteItem[]): boolean {
  return items.some((item) => !item.ok);
}
