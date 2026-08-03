import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Boxes, Lock, ShieldAlert } from 'lucide-react';

import * as productsApi from '@/api/products';
import * as inventoryApi from '@/api/inventory';
import * as lotsApi from '@/api/lots';
import { extractApiErrorMessage } from '@/api/httpClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';

/** Aba "Saldos": tiles de indicadores + tabela de produtos com ação de movimentação. */
export function BalancesTab() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [movementProduct, setMovementProduct] = React.useState<productsApi.Product | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['inventory-products', search, page],
    queryFn: () => productsApi.listProducts({ search: search || undefined, limit: 20, page }),
  });

  const { data: lowStock } = useQuery({
    queryKey: ['inventory-low-stock'],
    queryFn: inventoryApi.listLowStock,
  });

  const { data: quarantineLots } = useQuery({
    queryKey: ['inventory-lots-summary', 'quarantine'],
    queryFn: () => lotsApi.listLots({ status: 'quarantine', limit: 1 }),
  });

  const { data: blockedLots } = useQuery({
    queryKey: ['inventory-lots-summary', 'blocked'],
    queryFn: () => lotsApi.listLots({ status: 'blocked', limit: 1 }),
  });

  const { data: stockReport } = useQuery({
    queryKey: ['inventory-stock-report'],
    queryFn: inventoryApi.getStockReport,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Abaixo do mínimo</CardTitle>
            <AlertTriangle className="size-4 text-destructive" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-semibold">{lowStock?.length ?? '-'}</p>
            <CardDescription>Itens com estoque em ou abaixo do ponto de reposição</CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em quarentena</CardTitle>
            <ShieldAlert className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-semibold">{quarantineLots?.pagination.total ?? '-'}</p>
            <CardDescription>Lotes aguardando inspeção da Qualidade</CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bloqueados</CardTitle>
            <Lock className="size-4 text-destructive" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-semibold">{blockedLots?.pagination.total ?? '-'}</p>
            <CardDescription>Lotes bloqueados pela Qualidade</CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor em estoque</CardTitle>
            <Boxes className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-semibold">
              {stockReport ? `R$ ${stockReport.summary.total_value.toFixed(2)}` : '-'}
            </p>
            <CardDescription>Custo total dos produtos ativos</CardDescription>
          </CardContent>
        </Card>
      </div>

      <Input
        aria-label="Buscar produtos por nome ou código"
        placeholder="Buscar por nome ou código..."
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        className="max-w-sm"
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Saldo</TableHead>
            <TableHead>Reservado</TableHead>
            <TableHead>Mínimo</TableHead>
            <TableHead>Situação</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={canWrite ? 7 : 6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={canWrite ? 7 : 6} className="text-center text-destructive">
                Não foi possível carregar os produtos. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((product) => {
            const quantity = Number(product.quantity);
            const minQuantity = Number(product.min_quantity);
            const isLow = quantity <= minQuantity;
            return (
              <TableRow key={product.id}>
                <TableCell>{product.code}</TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell className={isLow ? 'font-medium text-destructive' : ''}>{quantity}</TableCell>
                {/* Reserva não é exposta por produto no backend atual (apenas agregada); exibimos "-" até existir endpoint dedicado. */}
                <TableCell>-</TableCell>
                <TableCell>{minQuantity}</TableCell>
                <TableCell>
                  <Badge variant={isLow ? 'destructive' : 'success'}>{isLow ? 'Abaixo do mínimo' : 'OK'}</Badge>
                </TableCell>
                {canWrite && (
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setMovementProduct(product)}>
                      Movimentar
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={canWrite ? 7 : 6} className="text-center text-muted-foreground">
                Nenhum produto encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <StockMovementDialog product={movementProduct} onClose={() => setMovementProduct(null)} />
    </div>
  );
}

const movementSchema = z.object({
  type: z.enum(['in', 'out']),
  quantity: z.coerce.number().positive('Informe uma quantidade maior que zero.'),
  description: z.string().max(500).optional(),
});

type MovementFormData = z.infer<typeof movementSchema>;

/**
 * Dialog de movimentação manual de estoque (entrada/saída) — reaproveitado
 * de `ProductsPage` (onde a ação existia originalmente), agora centralizado
 * em Logística → Estoque, mesmo endpoint/payload (`POST /api/products/movements`).
 */
function StockMovementDialog({ product, onClose }: { product: productsApi.Product | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MovementFormData>({ resolver: zodResolver(movementSchema), defaultValues: { type: 'in' } });

  const mutation = useMutation({
    mutationFn: (values: MovementFormData) =>
      productsApi.createStockMovement({ product_id: product!.id, ...values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock-report'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      reset();
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(extractApiErrorMessage(error)),
  });

  React.useEffect(() => {
    if (product) {
      reset({ type: 'in', quantity: undefined, description: '' } as never);
      setFormError(null);
    }
  }, [product, reset]);

  return (
    <Dialog open={Boolean(product)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Movimentar estoque — {product?.name}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type">Tipo</Label>
            <SelectNative id="type" {...register('type')}>
              <option value="in">Entrada</option>
              <option value="out">Saída</option>
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quantity">Quantidade</Label>
            <Input id="quantity" type="number" step="any" {...register('quantity')} />
            {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Motivo (opcional)</Label>
            <Input id="description" {...register('description')} />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || !product || mutation.isPending}>
              {isSubmitting ? 'Salvando...' : 'Confirmar movimentação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
