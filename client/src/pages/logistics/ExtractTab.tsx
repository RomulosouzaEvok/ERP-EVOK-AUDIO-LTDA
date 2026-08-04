import * as React from 'react';
import { useQuery } from '@tanstack/react-query';

import * as inventoryApi from '@/api/inventory';
import * as warehousesApi from '@/api/warehouses';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
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

/**
 * Aba "Extrato": histórico de movimentações de estoque
 * (`GET /api/inventory/movements`). Aceita o filtro opcional "Depósito"
 * (`warehouse_id`, Bloco 4, UC-42), reaproveitando o mesmo padrão visual do
 * seletor de depósito já usado em `BalancesTab.tsx`.
 */
export function ExtractTab() {
  const [page, setPage] = React.useState(1);
  const [warehouseId, setWarehouseId] = React.useState<string>('');

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehousesApi.listWarehouses,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['inventory-movements', page, warehouseId],
    queryFn: () =>
      inventoryApi.listMovements({
        page,
        limit: 20,
        warehouse_id: warehouseId ? Number(warehouseId) : undefined,
      }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="extract-warehouse" className="text-sm text-muted-foreground">
            Depósito
          </Label>
          <SelectNative
            id="extract-warehouse"
            className="max-w-56"
            value={warehouseId}
            onChange={(event) => {
              setWarehouseId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos os depósitos</option>
            {(warehouses ?? []).map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </SelectNative>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
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
              <TableCell className="text-right tabular-nums">{Number(movement.quantity)}</TableCell>
              <TableCell className="text-muted-foreground">{movement.description ?? '-'}</TableCell>
              <TableCell className="text-muted-foreground">
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
