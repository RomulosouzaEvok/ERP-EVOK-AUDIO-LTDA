import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Boxes, Lock, ShieldAlert } from 'lucide-react';

import * as productsApi from '@/api/products';
import * as inventoryApi from '@/api/inventory';
import * as lotsApi from '@/api/lots';
import * as warehousesApi from '@/api/warehouses';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
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

/**
 * Aba "Saldos": tiles de indicadores + tabela de produtos com ação de
 * movimentação. Com "Todos os depósitos" selecionado, mantém a visão
 * legada (saldo total de `products.quantity`, `GET /api/products`). Com um
 * depósito específico selecionado, troca para o saldo POR DEPÓSITO
 * (`GET /api/inventory/warehouse-stock?warehouse_code=`, Bloco 4, UC-42).
 */
export function BalancesTab() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [warehouseCode, setWarehouseCode] = React.useState<string>('');
  const [movementProduct, setMovementProduct] = React.useState<productsApi.Product | null>(null);

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehousesApi.listWarehouses,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['inventory-products', search, page],
    queryFn: () => productsApi.listProducts({ search: search || undefined, limit: 20, page }),
    enabled: !warehouseCode,
  });

  const { data: warehouseStock, isLoading: isWarehouseStockLoading, isError: isWarehouseStockError } = useQuery({
    queryKey: ['warehouse-stock', warehouseCode, page],
    queryFn: () => warehousesApi.listWarehouseStock({ warehouse_code: warehouseCode, limit: 20, page }),
    enabled: Boolean(warehouseCode),
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
        <Card className="border-l-4 border-l-destructive/60 transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Abaixo do mínimo</CardTitle>
            <AlertTriangle className="size-4 text-destructive" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-semibold tabular-nums">{lowStock?.length ?? '-'}</p>
            <CardDescription>Itens com estoque em ou abaixo do ponto de reposição</CardDescription>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500/60 transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em quarentena</CardTitle>
            <ShieldAlert className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-semibold tabular-nums">{quarantineLots?.pagination.total ?? '-'}</p>
            <CardDescription>Lotes aguardando inspeção da Qualidade</CardDescription>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive/60 transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bloqueados</CardTitle>
            <Lock className="size-4 text-destructive" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-semibold tabular-nums">{blockedLots?.pagination.total ?? '-'}</p>
            <CardDescription>Lotes bloqueados pela Qualidade</CardDescription>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-brand/60 transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor em estoque</CardTitle>
            <Boxes className="size-4 text-brand" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-semibold tabular-nums">
              {stockReport ? `R$ ${stockReport.summary.total_value.toFixed(2)}` : '-'}
            </p>
            <CardDescription>Custo total dos produtos ativos</CardDescription>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="balances-search" className="text-sm text-muted-foreground">
            Buscar
          </Label>
          <Input
            id="balances-search"
            aria-label="Buscar produtos por nome ou código"
            placeholder="Buscar por nome ou código..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="max-w-sm"
            disabled={Boolean(warehouseCode)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="balances-warehouse" className="text-sm text-muted-foreground">
            Depósito
          </Label>
          <SelectNative
            id="balances-warehouse"
            className="max-w-56"
            value={warehouseCode}
            onChange={(event) => {
              setWarehouseCode(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {(warehouses ?? []).map((warehouse) => (
              <option key={warehouse.id} value={warehouse.code}>
                {warehouse.name}
              </option>
            ))}
          </SelectNative>
        </div>
      </div>

      {!warehouseCode && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-right">Reservado</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
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
                    <TableCell className="font-mono text-xs">{product.code}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell className={cn('text-right tabular-nums', isLow && 'font-medium text-destructive')}>
                      {quantity}
                    </TableCell>
                    {/* Reserva não é exposta por produto no backend atual (apenas agregada); exibimos "-" até existir endpoint dedicado. */}
                    <TableCell className="text-right tabular-nums text-muted-foreground">-</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{minQuantity}</TableCell>
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
        </>
      )}

      {warehouseCode && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Depósito</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isWarehouseStockLoading && <TableSkeletonRows columns={4} />}
              {isWarehouseStockError && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-destructive">
                    Não foi possível carregar o saldo por depósito. Tente novamente.
                  </TableCell>
                </TableRow>
              )}
              {warehouseStock?.data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.product?.code ?? row.product_id}</TableCell>
                  <TableCell>{row.product?.name ?? '-'}</TableCell>
                  <TableCell>{row.warehouse?.name ?? '-'}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(row.quantity)}</TableCell>
                </TableRow>
              ))}
              {!isWarehouseStockLoading && !isWarehouseStockError && warehouseStock?.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum saldo encontrado para este depósito.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Pagination pagination={warehouseStock?.pagination} onPageChange={setPage} />
        </>
      )}

      <StockMovementDialog product={movementProduct} onClose={() => setMovementProduct(null)} />
    </div>
  );
}

const movementSchema = z.object({
  type: z.enum(['in', 'out']),
  quantity: z.coerce.number().positive('Informe uma quantidade maior que zero.'),
  description: z.string().max(500).optional(),
  warehouse_code: z.string().min(1, 'Selecione o depósito.'),
});

type MovementFormData = z.infer<typeof movementSchema>;

/**
 * Dialog de movimentação manual de estoque (entrada/saída) — reaproveitado
 * de `ProductsPage` (onde a ação existia originalmente), agora centralizado
 * em Logística → Estoque. Usa `POST /api/inventory/movements` (não mais
 * `POST /api/products/movements`), único endpoint que aceita
 * `warehouse_code` e faz dual-write em `product_warehouse_stock`
 * (Bloco 4, UC-42).
 */
function StockMovementDialog({ product, onClose }: { product: productsApi.Product | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehousesApi.listWarehouses,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: { type: 'in', warehouse_code: 'INSUMOS' },
  });

  const mutation = useMutation({
    mutationFn: (values: MovementFormData) =>
      inventoryApi.createMovement({
        product_id: product!.id,
        type: values.type,
        quantity: values.quantity,
        description: values.description?.trim() || `Movimentação manual (${values.type})`,
        warehouse_code: values.warehouse_code,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock-report'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stock'] });
      reset();
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível movimentar o estoque')),
  });

  React.useEffect(() => {
    if (product) {
      reset({ type: 'in', quantity: undefined, description: '', warehouse_code: 'INSUMOS' } as never);
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
            <Label htmlFor="warehouse_code">Depósito</Label>
            <SelectNative id="warehouse_code" {...register('warehouse_code')}>
              {(warehouses ?? []).map((warehouse) => (
                <option key={warehouse.id} value={warehouse.code}>
                  {warehouse.name}
                </option>
              ))}
              {!warehouses?.length && <option value="INSUMOS">Insumos</option>}
            </SelectNative>
            {errors.warehouse_code && <p className="text-sm text-destructive">{errors.warehouse_code.message}</p>}
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
          {formError && <DidacticAlert error={formError} />}
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
