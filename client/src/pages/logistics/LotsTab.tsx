import * as React from 'react';
import { useQuery } from '@tanstack/react-query';

import * as lotsApi from '@/api/lots';
import { Label } from '@/components/ui/label';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';

const STATUS_LABEL: Record<lotsApi.LotStatus, string> = {
  available: 'Liberado',
  quarantine: 'Em quarentena',
  blocked: 'Bloqueado',
  consumed: 'Consumido',
  expired: 'Expirado',
  reserved: 'Reservado',
};

const STATUS_BADGE: Record<lotsApi.LotStatus, BadgeProps['variant']> = {
  available: 'success',
  quarantine: 'warning',
  blocked: 'destructive',
  consumed: 'secondary',
  expired: 'outline',
  reserved: 'secondary',
};

const STATUS_BADGE_CLASS: Partial<Record<lotsApi.LotStatus, string>> = {
  expired: 'border-orange-500 text-orange-600',
};

function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
}

/**
 * Aba "Lotes" — somente leitura, com filtro por situação. Ações de
 * liberar/bloquear lote permanecem exclusivamente em `/quality`
 * (`InspectionTab`), não duplicadas aqui.
 */
export function LotsTab() {
  const [statusFilter, setStatusFilter] = React.useState<lotsApi.LotStatus | ''>('');
  const [page, setPage] = React.useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['logistics-lots', statusFilter, page],
    queryFn: () => lotsApi.listLots({ status: statusFilter || undefined, page, limit: 20 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Label htmlFor="lot-status-filter" className="text-sm text-muted-foreground">
          Situação
        </Label>
        <SelectNative
          id="lot-status-filter"
          className="max-w-52"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as lotsApi.LotStatus | '');
            setPage(1);
          }}
        >
          <option value="">Todas</option>
          <option value="available">Liberado</option>
          <option value="quarantine">Em quarentena</option>
          <option value="blocked">Bloqueado</option>
          <option value="consumed">Consumido</option>
          <option value="expired">Expirado</option>
          <option value="reserved">Reservado</option>
        </SelectNative>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lote</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Qtd. inicial</TableHead>
            <TableHead>Qtd. disponível</TableHead>
            <TableHead>Recebido em</TableHead>
            <TableHead>Validade</TableHead>
            <TableHead>Situação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={8} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-destructive">
                Não foi possível carregar os lotes. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((lot) => (
            <TableRow key={lot.id}>
              <TableCell className="font-medium">{lot.lot_number}</TableCell>
              <TableCell>{lot.product ? `${lot.product.code} — ${lot.product.name}` : lot.product_id}</TableCell>
              <TableCell>{lot.supplier?.company_name ?? '-'}</TableCell>
              <TableCell>{Number(lot.quantity_initial)}</TableCell>
              <TableCell>{Number(lot.quantity_available)}</TableCell>
              <TableCell>{formatDate(lot.received_at)}</TableCell>
              <TableCell>{formatDate(lot.expires_at)}</TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE[lot.status]} className={STATUS_BADGE_CLASS[lot.status]}>
                  {STATUS_LABEL[lot.status]}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                Nenhum lote encontrado para este filtro.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />
    </div>
  );
}
