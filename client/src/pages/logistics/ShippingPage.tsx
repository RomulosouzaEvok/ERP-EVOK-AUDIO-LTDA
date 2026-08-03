import * as React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { Eye, Send, AlertTriangle } from 'lucide-react';

import * as salesApi from '@/api/sales';
import { extractApiErrorMessage } from '@/api/httpClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DetailField } from '@/components/DetailField';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';

const STATUS_LABEL: Record<salesApi.SaleStatus, string> = {
  quote: 'Orçamento',
  confirmed: 'Confirmada',
  invoiced: 'Faturada',
  shipped: 'Embarcada',
  canceled: 'Cancelada',
};

const STATUS_VARIANT: Record<salesApi.SaleStatus, 'default' | 'success' | 'destructive' | 'secondary'> = {
  quote: 'secondary',
  confirmed: 'default',
  invoiced: 'success',
  shipped: 'success',
  canceled: 'destructive',
};

const NFE_STATUS_LABEL: Record<string, string> = {
  pending: 'Não emitida',
  processing: 'Processando',
  authorized: 'Autorizada',
  denied: 'Negada',
  cancelled: 'Cancelada',
};

const NFE_STATUS_VARIANT: Record<string, 'default' | 'success' | 'destructive' | 'secondary' | 'warning'> = {
  pending: 'secondary',
  processing: 'warning',
  authorized: 'success',
  denied: 'destructive',
  cancelled: 'secondary',
};

type QueueFilter = 'pending' | 'shipped';

/** `FE6`: fila de expedição — vendas confirmadas/faturadas prontas para embarque. */
export default function ShippingPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();
  const [filter, setFilter] = React.useState<QueueFilter>('pending');
  const [detailsSale, setDetailsSale] = React.useState<salesApi.Sale | null>(null);

  const results = useQueries({
    queries: [
      { queryKey: ['shipping', 'confirmed'], queryFn: () => salesApi.listSales({ status: 'confirmed', limit: 100 }) },
      { queryKey: ['shipping', 'invoiced'], queryFn: () => salesApi.listSales({ status: 'invoiced', limit: 100 }) },
      { queryKey: ['shipping', 'shipped'], queryFn: () => salesApi.listSales({ status: 'shipped', limit: 100 }) },
    ],
  });

  const [confirmedQuery, invoicedQuery, shippedQuery] = results;
  const isLoading = confirmedQuery.isLoading || invoicedQuery.isLoading || shippedQuery.isLoading;
  const isError = confirmedQuery.isError || invoicedQuery.isError || shippedQuery.isError;

  const pendingSales = React.useMemo(
    () => [...(confirmedQuery.data?.data ?? []), ...(invoicedQuery.data?.data ?? [])],
    [confirmedQuery.data, invoicedQuery.data],
  );
  const shippedSales = shippedQuery.data?.data ?? [];
  const visibleSales = filter === 'pending' ? pendingSales : shippedSales;

  const invalidateShipping = () => {
    queryClient.invalidateQueries({ queryKey: ['shipping'] });
    queryClient.invalidateQueries({ queryKey: ['sales'] });
  };

  const shipMutation = useMutation({
    mutationFn: (id: number) => salesApi.updateSaleStatus(id, 'shipped'),
    onSuccess: invalidateShipping,
    onError: (error) => window.alert(extractApiErrorMessage(error, 'Não foi possível marcar a venda como embarcada.')),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Expedição</h1>
        <div className="flex gap-2">
          <Button size="sm" variant={filter === 'pending' ? 'default' : 'outline'} onClick={() => setFilter('pending')}>
            Fila de embarque
          </Button>
          <Button size="sm" variant={filter === 'shipped' ? 'default' : 'outline'} onClick={() => setFilter('shipped')}>
            Embarcadas
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Venda</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Itens</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>NF-e</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={7} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-destructive">
                Não foi possível carregar a fila de expedição. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {!isLoading &&
            !isError &&
            visibleSales.map((sale) => {
              const nfeStatus = sale.nfe_status ?? 'pending';
              const itemsCount = sale.items?.length ?? 0;
              const canShip = sale.status === 'invoiced' && nfeStatus === 'authorized';
              const needsNfe = sale.status === 'invoiced' && nfeStatus !== 'authorized';

              return (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">#{sale.id}</TableCell>
                  <TableCell>{sale.customer?.name ?? sale.customer_id}</TableCell>
                  <TableCell>{itemsCount > 0 ? `${itemsCount} item(ns)` : '—'}</TableCell>
                  <TableCell>R$ {Number(sale.total_amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={NFE_STATUS_VARIANT[nfeStatus] ?? 'secondary'}>{NFE_STATUS_LABEL[nfeStatus] ?? nfeStatus}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[sale.status]}>{STATUS_LABEL[sale.status]}</Badge>
                  </TableCell>
                  <TableCell className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setDetailsSale(sale)}>
                      <Eye className="size-4" /> Ver itens
                    </Button>
                    {needsNfe && (
                      <span className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertTriangle className="size-3.5" />
                        Emita a NF-e na{' '}
                        <Link to="/sales" className="underline underline-offset-2">
                          tela de Vendas
                        </Link>{' '}
                        antes de embarcar
                      </span>
                    )}
                    {canWrite && canShip && (
                      <Button
                        size="sm"
                        disabled={shipMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Marcar a venda #${sale.id} como embarcada?`)) {
                            shipMutation.mutate(sale.id);
                          }
                        }}
                      >
                        <Send className="size-4" /> Marcar como embarcada
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          {!isLoading && !isError && visibleSales.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                {filter === 'pending' ? 'Nenhuma venda aguardando embarque.' : 'Nenhuma venda embarcada.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <ShippingItemsDialog sale={detailsSale} onClose={() => setDetailsSale(null)} />
    </div>
  );
}

function ShippingItemsDialog({ sale, onClose }: { sale: salesApi.Sale | null; onClose: () => void }) {
  const [fullSale, setFullSale] = React.useState<salesApi.Sale | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!sale) {
      setFullSale(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    salesApi
      .getSale(sale.id)
      .then((data) => {
        if (!cancelled) setFullSale(data);
      })
      .catch((err) => {
        if (!cancelled) setError(extractApiErrorMessage(err, 'Não foi possível carregar os itens da venda.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sale]);

  const items = fullSale?.items ?? [];

  return (
    <Dialog open={Boolean(sale)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Picking — Venda #{sale?.id}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-4">
            <DetailField label="Cliente" value={fullSale?.customer?.name ?? sale?.customer_id ?? '—'} />
            <DetailField
              label="Status"
              value={sale ? <Badge variant={STATUS_VARIANT[sale.status]}>{STATUS_LABEL[sale.status]}</Badge> : '—'}
            />
          </div>

          {loading && <p className="text-sm text-muted-foreground">Carregando itens...</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {!loading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.product ? `${item.product.code} — ${item.product.name}` : item.product_id}</TableCell>
                    <TableCell>{Number(item.quantity)}</TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      Itens não disponíveis.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
