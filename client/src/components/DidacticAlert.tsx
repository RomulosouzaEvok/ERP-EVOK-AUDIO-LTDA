import { Link } from 'react-router';
import { AlertTriangle } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { DidacticError } from '@/lib/translateApiError';

/**
 * Alerta visual do Padrão Didático de 3 Partes (`docs/business/BUSINESS_RULES.md`
 * §13, UC-43): título forte (O QUE), lista de motivos com dados concretos
 * (POR QUE — todas as pendências, nunca só a primeira) e um botão/link de
 * ação (O QUE FAZER). Usar em conjunto com `translateApiError` para
 * traduzir erros de mutation, ou compor `error` manualmente para validações
 * locais.
 *
 * Uso típico:
 * ```tsx
 * const [error, setError] = React.useState<DidacticError | null>(null);
 * // ...
 * onError: (err) => setError(translateApiError(err, 'Não foi possível concluir a OP-123', 'complete-production-order')),
 * // ...
 * {error && <DidacticAlert error={error} />}
 * ```
 */
export function DidacticAlert({ error, className }: { error: DidacticError; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <p className="font-semibold">{error.title}</p>
      </div>

      {error.reasons.length > 0 && (
        <ul className="ml-6 list-disc space-y-0.5">
          {error.reasons.map((reason, index) => (
            <li key={index}>{reason}</li>
          ))}
        </ul>
      )}

      {error.action && (
        <div className="ml-6">
          {error.action.to ? (
            <Link to={error.action.to} className="font-medium underline underline-offset-2">
              {error.action.label}
            </Link>
          ) : (
            <span className="font-medium">{error.action.label}</span>
          )}
        </div>
      )}
    </div>
  );
}
