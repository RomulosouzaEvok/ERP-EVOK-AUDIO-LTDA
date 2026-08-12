import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';

import * as maintenanceApi from '@/api/maintenance';
import * as assetsApi from '@/api/assets';
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

const STATUS_LABEL: Record<maintenanceApi.MaintenanceOrderStatus, string> = {
  open: 'Aberta',
  scheduled: 'Agendada',
  in_progress: 'Em andamento',
  waiting_parts: 'Aguardando peças',
  completed: 'Concluída',
  canceled: 'Cancelada',
};

const STATUS_VARIANT: Record<maintenanceApi.MaintenanceOrderStatus, BadgeProps['variant']> = {
  open: 'secondary',
  scheduled: 'outline',
  in_progress: 'default',
  waiting_parts: 'destructive',
  completed: 'success',
  canceled: 'secondary',
};

const TYPE_LABEL: Record<maintenanceApi.MaintenanceOrderType, string> = {
  preventive: 'Preventiva',
  corrective: 'Corretiva',
  predictive: 'Preditiva',
  emergency: 'Emergencial',
  overhaul: 'Recondicionamento',
};

const PRIORITY_LABEL: Record<maintenanceApi.MaintenanceOrderPriority, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  emergency: 'Emergência',
};

const createSchema = z.object({
  asset_id: z.coerce.number({ message: 'Selecione o ativo.' }).int().positive('Selecione o ativo.'),
  description: z.string().trim().min(1, 'Descreva o problema.').max(2000),
  maintenance_type: z.enum(['preventive', 'corrective', 'predictive', 'emergency', 'overhaul']),
  priority: z.enum(['low', 'normal', 'high', 'emergency']),
});

type CreateFormData = z.infer<typeof createSchema>;

/**
 * Aba "Manutenção de ativos" (`/api/maintenance`) — ordens de manutenção
 * preventiva/corretiva de máquinas e equipamentos internos, vinculadas a um
 * `Asset` (Patrimônio).
 */
export function MaintenanceOrdersTab() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const canCancel = hasRole('admin');
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = React.useState<maintenanceApi.MaintenanceOrderStatus | ''>('');
  const [page, setPage] = React.useState(1);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createError, setCreateError] = React.useState<DidacticError | null>(null);
  const [detailOrder, setDetailOrder] = React.useState<maintenanceApi.MaintenanceOrder | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['maintenance-orders', page, statusFilter],
    queryFn: () => maintenanceApi.listMaintenanceOrders({ limit: 20, page, status: statusFilter || undefined }),
  });

  const { data: assets } = useQuery({
    queryKey: ['assets-all'],
    queryFn: () => assetsApi.listAssets({ limit: 200 }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { asset_id: undefined, description: '', maintenance_type: 'corrective', priority: 'normal' },
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateFormData) =>
      maintenanceApi.createMaintenanceOrder({
        asset_id: values.asset_id,
        description: values.description.trim(),
        maintenance_type: values.maintenance_type,
        priority: values.priority,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-orders'] });
      setCreateOpen(false);
      reset({ asset_id: undefined, description: '', maintenance_type: 'corrective', priority: 'normal' });
      setCreateError(null);
    },
    onError: (error) => setCreateError(translateApiError(error, 'Não foi possível abrir a ordem de manutenção')),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Label htmlFor="maintenance-status-filter" className="text-sm text-muted-foreground">
            Status
          </Label>
          <SelectNative
            id="maintenance-status-filter"
            className="w-48"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as maintenanceApi.MaintenanceOrderStatus | '');
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
                reset({ asset_id: undefined, description: '', maintenance_type: 'corrective', priority: 'normal' });
                setCreateError(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus /> Abrir ordem de manutenção
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova ordem de manutenção</DialogTitle>
              </DialogHeader>
              <form
                className="flex flex-col gap-3"
                noValidate
                onSubmit={handleSubmit((values) => createMutation.mutate(values))}
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="maintenance-asset">Ativo *</Label>
                  <SelectNative id="maintenance-asset" defaultValue="" {...register('asset_id')}>
                    <option value="" disabled>
                      Selecione o ativo
                    </option>
                    {assets?.data.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.tag} — {asset.name}
                      </option>
                    ))}
                  </SelectNative>
                  {errors.asset_id && <p className="text-sm text-destructive">{errors.asset_id.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="maintenance-type">Tipo</Label>
                    <SelectNative id="maintenance-type" {...register('maintenance_type')}>
                      {Object.entries(TYPE_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="maintenance-priority">Prioridade</Label>
                    <SelectNative id="maintenance-priority" {...register('priority')}>
                      {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="maintenance-description">Descrição do problema *</Label>
                  <Textarea id="maintenance-description" rows={3} {...register('description')} />
                  {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
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
            <TableHead>Ativo</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Aberta em</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={7} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-destructive">
                Não foi possível carregar as ordens de manutenção. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-mono text-xs">{order.order_number}</TableCell>
              <TableCell>{order.asset ? `${order.asset.tag} — ${order.asset.name}` : `Ativo #${order.asset_id}`}</TableCell>
              <TableCell>{TYPE_LABEL[order.maintenance_type] ?? order.maintenance_type}</TableCell>
              <TableCell>{PRIORITY_LABEL[order.priority] ?? order.priority}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[order.status]}>{STATUS_LABEL[order.status] ?? order.status}</Badge>
              </TableCell>
              <TableCell>{order.report_date ? new Date(order.report_date).toLocaleDateString('pt-BR') : '-'}</TableCell>
              <TableCell className="flex gap-2">
                {canWrite && order.status !== 'canceled' && order.status !== 'completed' && (
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
                Nenhuma ordem de manutenção registrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <ManageOrderDialog
        order={detailOrder}
        canWrite={canWrite}
        canCancel={canCancel}
        onClose={() => setDetailOrder(null)}
      />
    </div>
  );
}

const updateSchema = z.object({
  status: z.enum(['open', 'scheduled', 'in_progress', 'waiting_parts', 'completed', 'canceled']),
  technician_id: z.coerce.number().int().positive().optional().or(z.literal(undefined)),
  diagnosis: z.string().trim().max(2000).optional(),
  solution: z.string().trim().max(2000).optional(),
  cost: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(2000).optional(),
});

type UpdateFormData = z.infer<typeof updateSchema>;

function ManageOrderDialog({
  order,
  canWrite,
  canCancel,
  onClose,
}: {
  order: maintenanceApi.MaintenanceOrder | null;
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
      maintenanceApi.updateMaintenanceOrder(order!.id, {
        status: values.status,
        technician_id: values.technician_id || undefined,
        diagnosis: values.diagnosis?.trim() || undefined,
        solution: values.solution?.trim() || undefined,
        cost: values.cost,
        notes: values.notes?.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-orders'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível salvar a ordem de manutenção')),
  });

  const cancelMutation = useMutation({
    mutationFn: () => maintenanceApi.cancelMaintenanceOrder(order!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-orders'] });
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível cancelar a ordem de manutenção')),
  });

  React.useEffect(() => {
    if (order) {
      reset({
        status: order.status,
        technician_id: order.technician_id ?? undefined,
        diagnosis: order.diagnosed_problem ?? '',
        solution: order.service_performed ?? '',
        cost: order.total_cost ? Number(order.total_cost) : undefined,
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
            {order.order_number} — {order.asset ? `${order.asset.tag} · ${order.asset.name}` : `Ativo #${order.asset_id}`}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Problema relatado:</span> {order.problem_description || '—'}
        </p>

        {canWrite ? (
          <form
            className="flex flex-col gap-3"
            noValidate
            onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="update-status">Status</Label>
                <SelectNative id="update-status" {...register('status')}>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="update-technician">Técnico responsável</Label>
                <SelectNative id="update-technician" defaultValue="" {...register('technician_id')}>
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
              <Label htmlFor="update-diagnosis">Diagnóstico</Label>
              <Textarea id="update-diagnosis" rows={2} {...register('diagnosis')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="update-solution">Serviço executado</Label>
              <Textarea id="update-solution" rows={2} {...register('solution')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="update-cost">Custo total (R$)</Label>
              <Input id="update-cost" type="number" step="0.01" min="0" {...register('cost')} />
              {errors.cost && <p className="text-sm text-destructive">{errors.cost.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="update-notes">Observações</Label>
              <Textarea id="update-notes" rows={2} {...register('notes')} />
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
