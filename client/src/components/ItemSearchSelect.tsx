import * as React from 'react';
import { useQuery } from '@tanstack/react-query';

import * as itemsApi from '@/api/items';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Combobox de busca de item mestre (`/api/items?search=`) com debounce.
 * Usado nos formulários de Requisição de Compra e MRP, onde a lista de itens
 * é grande demais para um `SelectNative` estático (padrão dos combos curtos).
 */
export function ItemSearchSelect({
  value,
  onChange,
  placeholder = 'Buscar item por código ou descrição...',
  disabled,
}: {
  value: itemsApi.Item | null;
  onChange: (item: itemsApi.Item | null) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['items-search', debouncedQuery],
    queryFn: () => itemsApi.listItems({ search: debouncedQuery || undefined, limit: 20 }),
    enabled: open,
  });

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder={placeholder}
        disabled={disabled}
        value={value ? `${value.codigo} — ${value.descricao}` : query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(null);
          setQuery(event.target.value);
          setOpen(true);
        }}
      />
      {open && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {isLoading && <p className="px-3 py-2 text-sm text-muted-foreground">Buscando...</p>}
          {!isLoading && data?.data.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum item encontrado.</p>
          )}
          {!isLoading &&
            data?.data.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  'flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                )}
                onClick={() => {
                  onChange(item);
                  setQuery('');
                  setOpen(false);
                }}
              >
                <span className="font-medium">
                  {item.codigo} — {item.descricao}
                </span>
                <span className="text-xs text-muted-foreground">
                  {/* O tipo fica visível (e em destaque quando não é insumo
                      produtivo): quem requisita um ATIVO_IMOBILIZADO ou MRO
                      precisa saber — a alçada de aprovação é outra. */}
                  <span
                    className={
                      item.tipo === 'ATIVO_IMOBILIZADO' || item.tipo === 'USO_E_CONSUMO'
                        ? 'font-medium text-amber-600 dark:text-amber-400'
                        : undefined
                    }
                  >
                    {itemsApi.ITEM_TYPE_LABEL[item.tipo] ?? item.tipo}
                  </span>
                  {' · '}
                  {item.unidade} · Estoque atual: {Number(item.estoque_atual)}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
