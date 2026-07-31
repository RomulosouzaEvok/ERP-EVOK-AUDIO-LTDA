import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/** Placeholder de carregamento (evita o "flash" de texto simples "Carregando..."). */
function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

export { Skeleton };
