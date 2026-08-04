import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Eye, Factory } from 'lucide-react';

import * as productionApi from '@/api/production';
import * as bomApi from '@/api/bom';
import * as productsApi from '@/api/products';
import { extractApiErrorMessage } from '@/api/httpClient';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { DetailField } from '@/components/DetailField';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';
import { DidacticAlert } from '@/components/DidacticAlert';
import CompleteProductionOrderDialog from './CompleteProductionOrderDialog';

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

const STATUS_LABEL: Record<productionApi.ProductionStatus, string> = {
  planned: 'Planejada',
  released: 'Liberada',
  in_progress: 'Em produção',
  paused: 'Pausada',
  completed: 'Concluída',
  canceled: 'Cancelada',
};

/** Cores por status da ordem de produção — mesma linguagem visual do MRP. */
const STATUS_BADGE_CLASS: Record<productionApi.ProductionStatus, string> = {
  planned: 'border-transparent bg-muted text-muted-foreground',
  released: 'border-transparent bg-blue-600 text-white',
  in_progress: 'border-transparent bg-amber-500 text-white',
  paused: 'border-transparent bg-secondary text-secondary-foreground',
  completed: 'border-transparent bg-emerald-600 text-white',
  canceled: 'border-transparent bg-destructive text-destructive-foreground',
};

// `in_progress -> completed` não avança por aqui: exige o diálogo de
// consumo de lote (ver `CompleteProductionOrderDialog`), obrigatório pela API.
const NEXT_STATUS: Partial<Record<productionApi.ProductionStatus, productionApi.ProductionStatus>> = {
  planned: 'released',
  released: 'in_progress',
};

const orderSchema = z.object({
  product_id: z.coerce.number().int().positive('Selecione o produto.'),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero.'),
  due_date: z.string().min(1, 'Informe a data prevista.'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

/** Ordens de produção — criar e avançar status. */
export default function ProductionOrdersPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [completingOrder, setCompletingOrder] = React.useState<productionApi.ProductionOrder | null>(null);
  const [detailsOrder, setDetailsOrder] = React.useState<productionApi.ProductionOrder | null>(null);
  const [page, setPage] = React.useState(1);
  const [statusError, setStatusError] = React.useState<DidacticError | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['production-orders', page],
    queryFn: () => productionApi.listProductionOrders({ limit: 20, page }),
  });
  const { data: products } = useQuery({ queryKey: ['products-all'], queryFn: () => productsApi.listProducts({ limit: 200 }) });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormData>({ resolver: zodResolver(orderSchema), defaultValues: { priority: 'normal' } });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['production-orders'] });

  const createMutation = useMutation({
    mutationFn: productionApi.createProductionOrder,
    onSuccess: () => {
      invalidate();
      setOpen(false);
      reset();
      setFormError(null);
    },
    onError: (error) => setFormError(extractApiErrorMessage(error)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: productionApi.ProductionStatus; orderLabel: string }) =>
      productionApi.updateProductionOrderStatus(id, status),
    onSuccess: () => {
      setStatusError(null);
      invalidate();
    },
    onError: (error, variables) =>
      setStatusError(
        translateApiError(
          error,
          `Não é possível liberar a ordem de produção ${variables.orderLabel}`,
          variables.status === 'released' ? 'release-production-order' : undefined,
        ),
      ),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Factory className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Ordens de produção</h1>
            <p className="text-sm text-muted-foreground">Acompanhe e avance o status das ordens de fabricação.</p>
          </div>
        </div>
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus /> Nova ordem
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova ordem de produção</DialogTitle>
              </DialogHeader>
              <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => createMutation.mutate(values))} noValidate>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="product_id">Produto</Label>
                  <SelectNative id="product_id" {...register('product_id')} defaultValue="">
                    <option value="" disabled>
                      Selecione...
                    </option>
                    {products?.data.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.code} — {product.name}
                      </option>
                    ))}
                  </SelectNative>
                  {errors.product_id && <p className="text-sm text-destructive">{errors.product_id.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="quantity">Quantidade</Label>
                    <Input id="quantity" type="number" step="any" {...register('quantity')} />
                    {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="due_date">Data prevista</Label>
                    <Input id="due_date" type="date" {...register('due_date')} />
                    {errors.due_date && <p className="text-sm text-destructive">{errors.due_date.message}</p>}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="priority">Prioridade</Label>
                  <SelectNative id="priority" {...register('priority')}>
                    <option value="low">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </SelectNative>
                </div>
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                    {isSubmitting ? 'Salvando...' : 'Criar ordem'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {statusError && <DidacticAlert error={statusError} />}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ordem</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Quantidade</TableHead>
            <TableHead>Prevista</TableHead>
            <TableHead>Status</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-destructive">
                Não foi possível carregar as ordens de produção. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((order) => {
            const next = NEXT_STATUS[order.status];
            return (
              <TableRow key={order.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setDetailsOrder(order)}>
                <TableCell className="font-medium">{order.order_number ?? order.id}</TableCell>
                <TableCell>{order.product?.name ?? order.product_id}</TableCell>
                <TableCell>{order.quantity}</TableCell>
                <TableCell>{new Date(order.due_date).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell>
                  <Badge className={STATUS_BADGE_CLASS[order.status]}>{STATUS_LABEL[order.status]}</Badge>
                </TableCell>
                {canWrite && (
                  <TableCell className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => setDetailsOrder(order)}>
                      <Eye className="size-4" /> Detalhes
                    </Button>
                    {next && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          statusMutation.mutate({
                            id: order.id,
                            status: next,
                            orderLabel: order.order_number ?? `#${order.id}`,
                          })
                        }
                      >
                        Avançar para "{STATUS_LABEL[next]}"
                      </Button>
                    )}
                    {order.status === 'in_progress' && (
                      <Button size="sm" onClick={() => setCompletingOrder(order)}>
                        Concluir produção
                      </Button>
                    )}
                    {order.status !== 'canceled' && order.status !== 'completed' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (window.confirm(`Cancelar a ordem ${order.order_number ?? order.id}?`)) {
                            statusMutation.mutate({
                              id: order.id,
                              status: 'canceled',
                              orderLabel: order.order_number ?? `#${order.id}`,
                            });
                          }
                        }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhuma ordem registrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <CompleteProductionOrderDialog order={completingOrder} onClose={() => setCompletingOrder(null)} />
      <ProductionOrderDetailSheet order={detailsOrder} onClose={() => setDetailsOrder(null)} />
    </div>
  );
}

function ProductionOrderDetailSheet({
  order,
  onClose,
}: {
  order: productionApi.ProductionOrder | null;
  onClose: () => void;
}) {
  const { data: activeBom } = useQuery({
    queryKey: ['bom-active-by-product', order?.product_id],
    queryFn: () => bomApi.getActiveBomByProduct(order!.product_id),
    enabled: Boolean(order),
  });

  const {
    data: explosion,
    isLoading: loadingExplosion,
    isError: errorExplosion,
  } = useQuery({
    queryKey: ['bom-explosion', activeBom?.id, order?.quantity],
    queryFn: () => bomApi.explodeBom(activeBom!.id, Number(order!.quantity)),
    enabled: Boolean(activeBom?.id && order),
  });

  return (
    <Sheet open={Boolean(order)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        {order && (
          <>
            <SheetHeader>
              <SheetTitle>Ordem de produção {order.order_number ?? `#${order.id}`}</SheetTitle>
              <SheetDescription>Detalhes completos da ordem de produção.</SheetDescription>
            </SheetHeader>

            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Produto" value={order.product ? `${order.product.code} — ${order.product.name}` : order.product_id} />
              <DetailField label="Status" value={<Badge variant="secondary">{STATUS_LABEL[order.status]}</Badge>} />
              <DetailField label="Quantidade planejada" value={order.quantity} />
              <DetailField label="Prioridade" value={order.priority ? PRIORITY_LABEL[order.priority] ?? order.priority : 'Normal'} />
              <DetailField label="Data prevista" value={new Date(order.due_date).toLocaleDateString('pt-BR')} />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">Consumo previsto (BOM ativa)</p>
              {!activeBom && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma BOM ativa cadastrada para este produto — cadastre em "Produção &gt; BOM" para ver o consumo previsto.
                </p>
              )}
              {activeBom && loadingExplosion && <p className="text-sm text-muted-foreground">Calculando consumo...</p>}
              {activeBom && errorExplosion && (
                <p className="text-sm text-destructive">Não foi possível calcular o consumo previsto.</p>
              )}
              {explosion && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Componente</TableHead>
                      <TableHead>Necessário</TableHead>
                      <TableHead>Em estoque</TableHead>
                      <TableHead>Custo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {explosion.components.map((component) => {
                      const insufficient = component.stock_available < component.quantity;
                      return (
                        <TableRow key={component.component_id}>
                          <TableCell>
                            {component.component_code} — {component.component_name}
                          </TableCell>
                          <TableCell>{component.quantity}</TableCell>
                          <TableCell className={insufficient ? 'text-destructive font-medium' : ''}>
                            {component.stock_available}
                            {insufficient && ' (insuficiente)'}
                          </TableCell>
                          <TableCell>R$ {Number(component.total_cost).toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              O consumo de lotes e a quantidade produzida são registrados ao concluir a ordem (botão "Concluir produção"),
              com rastreabilidade completa dos insumos utilizados.
            </p>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
