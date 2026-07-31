import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';

import * as productionApi from '@/api/production';
import * as productsApi from '@/api/products';
import { extractApiErrorMessage } from '@/api/httpClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import CompleteProductionOrderDialog from './CompleteProductionOrderDialog';

const STATUS_LABEL: Record<productionApi.ProductionStatus, string> = {
  planned: 'Planejada',
  released: 'Liberada',
  in_progress: 'Em produção',
  paused: 'Pausada',
  completed: 'Concluída',
  canceled: 'Cancelada',
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

/** `FE4`: ordens de produção — criar e avançar status. */
export default function ProductionOrdersPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [completingOrder, setCompletingOrder] = React.useState<productionApi.ProductionOrder | null>(null);

  const { data, isLoading, isError } = useQuery({ queryKey: ['production-orders'], queryFn: () => productionApi.listProductionOrders({ limit: 50 }) });
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
    mutationFn: ({ id, status }: { id: number; status: productionApi.ProductionStatus }) =>
      productionApi.updateProductionOrderStatus(id, status),
    onSuccess: invalidate,
    onError: (error) => window.alert(extractApiErrorMessage(error, 'Não foi possível alterar o status da ordem.')),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ordens de produção</h1>
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
          {isLoading && (
            <TableRow>
              <TableCell colSpan={6}>Carregando...</TableCell>
            </TableRow>
          )}
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
              <TableRow key={order.id}>
                <TableCell>{order.order_number ?? order.id}</TableCell>
                <TableCell>{order.product?.name ?? order.product_id}</TableCell>
                <TableCell>{order.quantity}</TableCell>
                <TableCell>{new Date(order.due_date).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{STATUS_LABEL[order.status]}</Badge>
                </TableCell>
                {canWrite && (
                  <TableCell className="flex gap-2">
                    {next && (
                      <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: order.id, status: next })}>
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
                            statusMutation.mutate({ id: order.id, status: 'canceled' });
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

      <CompleteProductionOrderDialog order={completingOrder} onClose={() => setCompletingOrder(null)} />
    </div>
  );
}
