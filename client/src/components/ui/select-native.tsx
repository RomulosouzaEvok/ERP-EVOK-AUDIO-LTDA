import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * `<select>` nativo estilizado (não Radix) — suficiente para listas curtas
 * de opção fixa (categoria, status, role). Para busca/autocomplete de listas
 * grandes (produto, cliente, fornecedor), usar um combobox dedicado.
 */
const SelectNative = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
SelectNative.displayName = 'SelectNative';

export { SelectNative };
