import * as React from 'react';
import { useQuery } from '@tanstack/react-query';

import * as inventoryApi from '@/api/inventory';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';

const TYPE_LABEL: Record<inventoryApi.InventoryMovementType, string> = {
  in: 'Entrada',
  out: 'Saída',
  adjustment: 'Ajuste',
};

const TYPE_BADGE: Record<inventoryApi.InventoryMovementType, BadgeProps['variant']> = {
  in: 'success',
  out: 'destructive',
  adjustment: 'secondary',
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pt-BR');
}

/** Aba "Extrato": histórico de movimentações de estoque (`GET /api/inventory/movements`). */
export function ExtractTab() {
  const [page, setPage] = React.useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['inventory-movements', page],
    queryFn: () => inventoryApi.listMovements({ page, limit: 20 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Quantidade</TableHead>
            <TableHead>Motivo/descrição</TableHead>
            <TableHead>Referência</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-destructive">
                Não foi possível carregar o extrato de movimentações. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((movement) => (
            <TableRow key={movement.id}>
              <TableCell>{formatDateTime(movement.createdAt)}</TableCell>
              <TableCell>
                {movement.product ? `${movement.product.code} — ${movement.product.name}` : movement.product_id}
              </TableCell>
              <TableCell>
                <Badge variant={TYPE_BADGE[movement.type]}>{TYPE_LABEL[movement.type]}</Badge>
              </TableCell>
              <TableCell>{Number(movement.quantity)}</TableCell>
              <TableCell>{movement.description ?? '-'}</TableCell>
              <TableCell>
                {movement.reference_type ? `${movement.reference_type} #${movement.reference_id}` : '-'}
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhuma movimentação encontrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />
    </div>
  );
}
