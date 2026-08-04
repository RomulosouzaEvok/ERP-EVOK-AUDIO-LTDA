import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';

import * as serviceOrdersApi from '@/api/serviceOrders';
import * as clientsApi from '@/api/clients';
import * as productsApi from '@/api/products';
import * as usersApi from '@/api/users';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/Textarea';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { DidacticAlert } from '@/components/DidacticAlert';
import { Pagination } from '@/components/Pagination';

const STATUS_LABEL: Record<serviceOrdersApi.ServiceOrderStatus, string> = {
  open: 'Aberta',
  diagnosing: 'Em diagnóstico',
  in_progress: 'Em andamento',
  waiting_parts: 'Aguardando peças',
  completed: 'Concluída',
  delivered: 'Entregue',
  canceled: 'Cancelada',
};

const STATUS_VARIANT: Record<serviceOrdersApi.ServiceOrderStatus, BadgeProps['variant']> = {
  open: 'secondary',
  diagnosing: 'outline',
  in_progress: 'default',
  waiting_parts: 'destructive',
  completed: 'success',
  delivered: 'success',
  canceled: 'secondary',
};

const PRIORITY_LABEL: Record<serviceOrdersApi.ServiceOrderPriority, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

const createSchema = z.object({
  client_id: z.coerce.number({ message: 'Selecione o cliente.' }).int().positive('Selecione o cliente.'),
  product_id: z.coerce.number().int().positive().optional().or(z.literal(undefined)),
  equipment_desc: z.string().trim().max(500).optional(),
  reported_issue: z.string().trim().min(1, 'Descreva o problema relatado.').max(2000),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
});

type CreateFormData = z.infer<typeof createSchema>;

/**
 * Aba "Ordens de serviço" (`/api/service-orders`) — assistência técnica de
 * produtos vendidos a clientes, vinculada a `Client` (obrigatório) e
 * opcionalmente a `Product`. Domínio distinto de `MaintenanceOrdersTab`
 * (ativos internos).
 */
export function ServiceOrdersTab() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const canCancel = hasRole('admin');
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = React.useState<serviceOrdersApi.ServiceOrderStatus | ''>('');
  const [page, setPage] = React.useState(1);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createError, setCreateError] = React.useState<DidacticError | null>(null);
  const [detailOrder, setDetailOrder] = React.useState<serviceOrdersApi.ServiceOrder | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['service-orders', page, statusFilter],
    queryFn: () => serviceOrdersApi.listServiceOrders({ limit: 20, page, status: statusFilter || undefined }),
  });

  const { data: clients } = useQuery({ queryKey: ['clients-all'], queryFn: () => clientsApi.listClients({ limit: 200 }) });
  const { data: products } = useQuery({ queryKey: ['products-all'], queryFn: () => productsApi.listProducts({ limit: 200 }) });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { client_id: undefined, product_id: undefined, equipment_desc: '', reported_issue: '', priority: 'normal' },
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateFormData) =>
      serviceOrdersApi.createServiceOrder({
        client_id: values.client_id,
        product_id: values.product_id || undefined,
        equipment_desc: values.equipment_desc?.trim() || undefined,
        reported_issue: values.reported_issue.trim(),
        priority: values.priority,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      setCreateOpen(false);
      reset({ client_id: undefined, product_id: undefined, equipment_desc: '', reported_issue: '', priority: 'normal' });
      setCreateError(null);
    },
    onError: (error) => setCreateError(translateApiError(error, 'Não foi possível abrir a ordem de serviço')),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Label htmlFor="so-status-filter" className="text-sm text-muted-foreground">
            Status
          </Label>
          <SelectNative
            id="so-status-filter"
            className="w-48"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as serviceOrdersApi.ServiceOrderStatus | '');
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectNative>
        </div>

        {canWrite && (
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) {
                reset({ client_id: undefined, product_id: undefined, equipment_desc: '', reported_issue: '', priority: 'normal' });
                setCreateError(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus /> Abrir ordem de serviço
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova ordem de serviço</DialogTitle>
              </DialogHeader>
              <form
                className="flex flex-col gap-3"
                noValidate
                onSubmit={handleSubmit((values) => createMutation.mutate(values))}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="so-client">Cliente *</Label>
                    <SelectNative id="so-client" defaultValue="" {...register('client_id')}>
                      <option value="" disabled>
                        Selecione o cliente
                      </option>
                      {clients?.data.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </SelectNative>
                    {errors.client_id && <p className="text-sm text-destructive">{errors.client_id.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="so-product">Produto (opcional)</Label>
                    <SelectNative id="so-product" defaultValue="" {...register('product_id')}>
                      <option value="">Não informado</option>
                      {products?.data.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.code} — {product.name}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="so-equipment">Descrição do equipamento</Label>
                  <Input id="so-equipment" placeholder="Ex.: Caixa ativa 15'' — número de série 123" {...register('equipment_desc')} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="so-priority">Prioridade</Label>
                  <SelectNative id="so-priority" {...register('priority')}>
                    {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </SelectNative>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="so-issue">Problema relatado pelo cliente *</Label>
                  <Textarea id="so-issue" rows={3} {...register('reported_issue')} />
                  {errors.reported_issue && <p className="text-sm text-destructive">{errors.reported_issue.message}</p>}
                </div>

                {createError && <DidacticAlert error={createError} />}

                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                    {createMutation.isPending ? 'Salvando...' : 'Abrir ordem'}
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
            <TableHead>Número</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Entrada</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={7} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-destructive">
                Não foi possível carregar as ordens de serviço. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-mono text-xs">{order.order_number}</TableCell>
              <TableCell>{order.client?.name ?? `Cliente #${order.client_id}`}</TableCell>
              <TableCell>{order.product ? `${order.product.code} — ${order.product.name}` : '-'}</TableCell>
              <TableCell>{PRIORITY_LABEL[order.priority] ?? order.priority}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[order.status]}>{STATUS_LABEL[order.status] ?? order.status}</Badge>
              </TableCell>
              <TableCell>{order.entry_date ? new Date(order.entry_date).toLocaleDateString('pt-BR') : '-'}</TableCell>
              <TableCell className="flex gap-2">
                {canWrite && order.status !== 'canceled' && order.status !== 'delivered' && (
                  <Button size="sm" variant="outline" onClick={() => setDetailOrder(order)}>
                    Gerenciar
                  </Button>
                )}
                {!canWrite && (
                  <Button size="sm" variant="outline" onClick={() => setDetailOrder(order)}>
                    Ver
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Nenhuma ordem de serviço registrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <ManageServiceOrderDialog
        order={detailOrder}
        canWrite={canWrite}
        canCancel={canCancel}
        onClose={() => setDetailOrder(null)}
      />
    </div>
  );
}

const updateSchema = z.object({
  status: z.enum(['open', 'diagnosing', 'in_progress', 'waiting_parts', 'completed', 'delivered', 'canceled']),
  technician_id: z.coerce.number().int().positive().optional().or(z.literal(undefined)),
  diagnosed_issue: z.string().trim().max(2000).optional(),
  service_performed: z.string().trim().max(2000).optional(),
  labor_cost: z.coerce.number().min(0).optional(),
  total_amount: z.coerce.number().min(0).optional(),
  warranty_days: z.coerce.number().int().min(0).optional(),
  notes: z.string().trim().max(2000).optional(),
});

type UpdateFormData = z.infer<typeof updateSchema>;

function ManageServiceOrderDialog({
  order,
  canWrite,
  canCancel,
  onClose,
}: {
  order: serviceOrdersApi.ServiceOrder | null;
  canWrite: boolean;
  canCancel: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const { data: technicians } = useQuery({
    queryKey: ['users-technicians'],
    queryFn: () => usersApi.listUsers({ limit: 200, active: true }),
    enabled: canWrite,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateFormData>({ resolver: zodResolver(updateSchema) });

  const updateMutation = useMutation({
    mutationFn: (values: UpdateFormData) =>
      serviceOrdersApi.updateServiceOrder(order!.id, {
        status: values.status,
        technician_id: values.technician_id || undefined,
        diagnosed_issue: values.diagnosed_issue?.trim() || undefined,
        service_performed: values.service_performed?.trim() || undefined,
        labor_cost: values.labor_cost,
        total_amount: values.total_amount,
        warranty_days: values.warranty_days,
        notes: values.notes?.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível salvar a ordem de serviço')),
  });

  const cancelMutation = useMutation({
    mutationFn: () => serviceOrdersApi.cancelServiceOrder(order!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível cancelar a ordem de serviço')),
  });

  React.useEffect(() => {
    if (order) {
      reset({
        status: order.status,
        technician_id: order.technician_id ?? undefined,
        diagnosed_issue: order.diagnosed_issue ?? '',
        service_performed: order.service_performed ?? '',
        labor_cost: order.labor_cost ? Number(order.labor_cost) : undefined,
        total_amount: order.total_amount ? Number(order.total_amount) : undefined,
        warranty_days: order.warranty_days ?? 90,
        notes: order.notes ?? '',
      });
      setFormError(null);
    }
  }, [order, reset]);

  if (!order) return null;

  return (
    <Dialog open={Boolean(order)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {order.order_number} — {order.client?.name ?? `Cliente #${order.client_id}`}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Problema relatado:</span> {order.reported_issue || '—'}
        </p>

        {canWrite ? (
          <form
            className="flex flex-col gap-3"
            noValidate
            onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="so-update-status">Status</Label>
                <SelectNative id="so-update-status" {...register('status')}>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="so-update-technician">Técnico responsável</Label>
                <SelectNative id="so-update-technician" defaultValue="" {...register('technician_id')}>
                  <option value="">Não atribuído</option>
                  {technicians?.data.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </SelectNative>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="so-update-diagnosed">Problema diagnosticado</Label>
              <Textarea id="so-update-diagnosed" rows={2} {...register('diagnosed_issue')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="so-update-performed">Serviço executado</Label>
              <Textarea id="so-update-performed" rows={2} {...register('service_performed')} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="so-update-labor">Mão de obra (R$)</Label>
                <Input id="so-update-labor" type="number" step="0.01" min="0" {...register('labor_cost')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="so-update-total">Total (R$)</Label>
                <Input id="so-update-total" type="number" step="0.01" min="0" {...register('total_amount')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="so-update-warranty">Garantia (dias)</Label>
                <Input id="so-update-warranty" type="number" step="1" min="0" {...register('warranty_days')} />
              </div>
            </div>
            {(errors.labor_cost || errors.total_amount || errors.warranty_days) && (
              <p className="text-sm text-destructive">Verifique os valores numéricos informados.</p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="so-update-notes">Observações</Label>
              <Textarea id="so-update-notes" rows={2} {...register('notes')} />
            </div>

            {formError && <DidacticAlert error={formError} />}

            <DialogFooter className="justify-between">
              {canCancel && order.status !== 'canceled' && (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate()}
                >
                  {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar ordem'}
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting || updateMutation.isPending}>
                {updateMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          formError && <DidacticAlert error={formError} />
        )}
      </DialogContent>
    </Dialog>
  );
}
