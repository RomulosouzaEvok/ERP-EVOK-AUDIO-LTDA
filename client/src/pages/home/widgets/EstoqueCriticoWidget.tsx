import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';

import * as inventoryApi from '@/api/inventory';
import { WidgetCard } from '@/pages/home/WidgetCard';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

/**
 * Widget `estoque-critico` — reaproveita a mesma query de estoque baixo do
 * painel executivo (`GET /api/inventory/low-stock`, `authorizeModule('estoque')`),
 * mas aponta para `/logistics/estoque` (tela do almoxarife) em vez de
 * `/products` (tela de cadastro, fora do alcance de quem só tem o módulo
 * `estoque`).
 */
export function EstoqueCriticoWidget() {
  const { data: lowStock, isLoading, isError } = useQuery({
    queryKey: ['home-low-stock'],
    queryFn: inventoryApi.listLowStock,
  });

  const count = lowStock?.length ?? 0;

  return (
    <WidgetCard
      icon={AlertTriangle}
      title="Estoque crítico"
      to="/logistics/estoque"
      actionLabel="Ir para o estoque"
      isLoading={isLoading}
      isError={isError}
      errorTitle='Não foi possível carregar "Estoque crítico"'
    >
      <div className="flex items-baseline gap-2">
        <p className={`text-3xl font-semibold tabular-nums ${count > 0 ? 'text-destructive' : ''}`}>{count}</p>
        <span className="text-xs text-muted-foreground">{count === 1 ? 'item abaixo do mínimo' : 'itens abaixo do mínimo'}</span>
      </div>

      {count > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lowStock?.slice(0, 5).map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-mono text-xs">{product.code}</TableCell>
                <TableCell className="truncate">{product.name}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="destructive" className="gap-1 tabular-nums">
                    {Number(product.quantity)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </WidgetCard>
  );
}
