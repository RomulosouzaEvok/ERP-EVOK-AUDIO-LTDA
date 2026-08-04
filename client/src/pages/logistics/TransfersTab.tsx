import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import * as warehousesApi from '@/api/warehouses';
import * as productsApi from '@/api/products';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { DidacticAlert } from '@/components/DidacticAlert';

const STATUS_LABEL: Record<warehousesApi.WarehouseTransferStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
};

const STATUS_BADGE: Record<warehousesApi.WarehouseTransferStatus, BadgeProps['variant']> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
};

/**
 * Aba "Transferências" — solicitação e fila de aprovação de transferências
 * entre depósitos (Bloco 4, UC-42 Fluxo F). Aprovar/rejeitar exige nível
 * `approve` no módulo `estoque` (`authorizeModule('estoque', 'approve')`
 * no backend); o botão só aparece para quem tem esse nível (ou `admin`).
 */
export function TransfersTab() {
  const { hasRole, permissions } = useAuth();
  const canApprove = hasRole('admin') || permissions?.estoque === 'approve';
  const [statusFilter, setStatusFilter] = React.useState<warehousesApi.WarehouseTransferStatus | ''>('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [rejectingId, setRejectingId] = React.useState<number | null>(null);
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['warehouse-transfers', statusFilter],
    queryFn: () => warehousesApi.listTransfers({ status: statusFilter || undefined }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => warehousesApi.approveTransfer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stock'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      setActionError(null);
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível aprovar a transferência')),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transfer-status-filter" className="text-sm text-muted-foreground">
              Situação
            </Label>
            <SelectNative
              id="transfer-status-filter"
              className="max-w-52"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as warehousesApi.WarehouseTransferStatus | '')}
            >
              <option value="">Todas</option>
              <option value="pending">Pendente</option>
              <option value="approved">Aprovada</option>
              <option value="rejected">Rejeitada</option>
            </SelectNative>
          </div>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Nova transferência
        </Button>
      </div>

      {actionError && <DidacticAlert error={actionError} />}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>De → Para</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Solicitante</TableHead>
            <TableHead>Situação</TableHead>
            {canApprove && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={canApprove ? 7 : 6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={canApprove ? 7 : 6} className="text-center text-destructive">
                Não foi possível carregar as transferências. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.map((transfer) => (
            <TableRow key={transfer.id}>
              <TableCell>
                {transfer.product ? `${transfer.product.code} — ${transfer.product.name}` : transfer.product_id}
              </TableCell>
              <TableCell>
                {(transfer.fromWarehouse?.name ?? transfer.from_warehouse_id) +
                  ' → ' +
                  (transfer.toWarehouse?.name ?? transfer.to_warehouse_id)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{Number(transfer.quantity)}</TableCell>
              <TableCell className="max-w-64 truncate text-muted-foreground" title={transfer.reason}>
                {transfer.reason}
              </TableCell>
              <TableCell>{transfer.requestedBy?.name ?? '-'}</TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE[transfer.status]}>{STATUS_LABEL[transfer.status]}</Badge>
              </TableCell>
              {canApprove && (
                <TableCell>
                  {transfer.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={approveMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Aprovar a transferência #${transfer.id}?`)) {
                            approveMutation.mutate(transfer.id);
                          }
                        }}
                      >
                        Aprovar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setRejectingId(transfer.id)}>
                        Rejeitar
                      </Button>
                    </div>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.length === 0 && (
            <TableRow>
              <TableCell colSpan={canApprove ? 7 : 6} className="text-center text-muted-foreground">
                Nenhuma transferência encontrada para este filtro.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <CreateTransferDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <RejectTransferDialog id={rejectingId} onClose={() => setRejectingId(null)} />
    </div>
  );
}

const createTransferSchema = z
  .object({
    product_id: z.string().min(1, 'Selecione o produto.'),
    from_warehouse_code: z.string().min(1, 'Selecione o depósito de origem.'),
    to_warehouse_code: z.string().min(1, 'Selecione o depósito de destino.'),
    quantity: z.coerce.number().positive('Informe uma quantidade maior que zero.'),
    reason: z.string().trim().min(1, 'Motivo é obrigatório.').max(1000),
  })
  .refine((values) => values.from_warehouse_code !== values.to_warehouse_code, {
    message: 'Depósito de origem e destino devem ser diferentes.',
    path: ['to_warehouse_code'],
  });

type CreateTransferFormData = z.infer<typeof createTransferSchema>;

function CreateTransferDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehousesApi.listWarehouses,
    enabled: open,
  });

  const { data: products } = useQuery({
    queryKey: ['products-for-transfer'],
    queryFn: () => productsApi.listProducts({ limit: 200 }),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransferFormData>({
    resolver: zodResolver(createTransferSchema),
    defaultValues: { product_id: '', from_warehouse_code: '', to_warehouse_code: '', reason: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateTransferFormData) =>
      warehousesApi.createTransfer({
        product_id: Number(values.product_id),
        from_warehouse_code: values.from_warehouse_code,
        to_warehouse_code: values.to_warehouse_code,
        quantity: values.quantity,
        reason: values.reason.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-transfers'] });
      reset();
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível solicitar a transferência')),
  });

  React.useEffect(() => {
    if (open) {
      reset({ product_id: '', from_warehouse_code: '', to_warehouse_code: '', quantity: undefined, reason: '' } as never);
      setFormError(null);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova transferência entre depósitos</DialogTitle>
          <DialogDescription>
            A transferência fica pendente até a aprovação de um gestor de Estoque — nenhum saldo é alterado até lá.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transfer-product">Produto *</Label>
            <SelectNative id="transfer-product" {...register('product_id')}>
              <option value="">Selecione...</option>
              {(products?.data ?? []).map((product) => (
                <option key={product.id} value={product.id}>
                  {product.code} — {product.name}
                </option>
              ))}
            </SelectNative>
            {errors.product_id && <p className="text-sm text-destructive">{errors.product_id.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="transfer-from">De *</Label>
              <SelectNative id="transfer-from" {...register('from_warehouse_code')}>
                <option value="">Selecione...</option>
                {(warehouses ?? []).map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.code}>
                    {warehouse.name}
                  </option>
                ))}
              </SelectNative>
              {errors.from_warehouse_code && (
                <p className="text-sm text-destructive">{errors.from_warehouse_code.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="transfer-to">Para *</Label>
              <SelectNative id="transfer-to" {...register('to_warehouse_code')}>
                <option value="">Selecione...</option>
                {(warehouses ?? []).map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.code}>
                    {warehouse.name}
                  </option>
                ))}
              </SelectNative>
              {errors.to_warehouse_code && (
                <p className="text-sm text-destructive">{errors.to_warehouse_code.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transfer-quantity">Quantidade *</Label>
            <Input id="transfer-quantity" type="number" step="any" {...register('quantity')} />
            {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transfer-reason">Motivo *</Label>
            <Input id="transfer-reason" {...register('reason')} />
            {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Enviando...' : 'Solicitar transferência'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const rejectSchema = z.object({
  reason: z.string().trim().min(1, 'Motivo da rejeição é obrigatório.').max(1000),
});

type RejectFormData = z.infer<typeof rejectSchema>;

function RejectTransferDialog({ id, onClose }: { id: number | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RejectFormData>({ resolver: zodResolver(rejectSchema), defaultValues: { reason: '' } });

  const mutation = useMutation({
    mutationFn: (values: RejectFormData) => warehousesApi.rejectTransfer(id!, values.reason.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-transfers'] });
      reset();
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível rejeitar a transferência')),
  });

  React.useEffect(() => {
    if (id !== null) {
      reset({ reason: '' });
      setFormError(null);
    }
  }, [id, reset]);

  return (
    <Dialog open={id !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeitar transferência #{id}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reject-reason">Motivo da rejeição *</Label>
            <Input id="reject-reason" {...register('reason')} />
            {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
          </div>
          {formError && <DidacticAlert error={formError} />}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Rejeitando...' : 'Confirmar rejeição'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
