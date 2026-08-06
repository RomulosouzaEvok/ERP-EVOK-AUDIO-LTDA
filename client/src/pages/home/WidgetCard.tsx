import * as React from 'react';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DidacticAlert } from '@/components/DidacticAlert';
import { translateApiError } from '@/lib/translateApiError';
import { cn } from '@/lib/utils';

/**
 * Casca visual comum aos widgets da Home por Perfil (`widgetRegistry.tsx`):
 * cabeçalho com ícone + título, corpo com loading (Skeleton)/erro
 * (DidacticAlert)/conteúdo, e um link de ação opcional no rodapé. Segue o
 * mesmo padrão de cards do `DashboardPage.tsx` (hover de elevação, ícone em
 * badge `bg-brand/10`).
 *
 * Nunca derruba a Home: se `isError`, mostra o alerta didático em vez do
 * conteúdo; se não houver widget correspondente a nenhum dado (uso externo),
 * o próprio widget deve retornar `null` antes de chegar aqui.
 */
export function WidgetCard({
  icon: Icon,
  title,
  to,
  actionLabel = 'Ver detalhes',
  isLoading,
  isError,
  errorTitle,
  className,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  to?: string;
  actionLabel?: string;
  isLoading?: boolean;
  isError?: boolean;
  errorTitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn('flex h-full flex-col shadow-sm transition-all duration-200 hover:shadow-lg', className)}>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Icon className="size-4" />
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : isError ? (
          <DidacticAlert error={translateApiError(null, errorTitle ?? `Não foi possível carregar "${title}"`)} />
        ) : (
          <div className="flex-1">{children}</div>
        )}

        {to && !isLoading && (
          <Link
            to={to}
            className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline underline-offset-2"
          >
            {actionLabel}
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
