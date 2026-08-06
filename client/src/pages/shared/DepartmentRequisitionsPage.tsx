import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, ClipboardList, type LucideIcon } from 'lucide-react';

import * as requisitionsApi from '@/api/purchaseRequisitions';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { useAuth } from '@/context/AuthContext';
import { useMyDepartment } from '@/hooks/useMyDepartment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ItemSearchSelect } from '@/components/ItemSearchSelect';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';

const STATUS_LABEL: Record<requisitionsApi.RequisitionStatus, string> = {
  draft: 'Rascunho',
  pending: 'Pendente',
  approved: 'Aprovada',
  ordered: 'Em compra',
  partial: 'Recebido parcial',
  received: 'Recebida',
  canceled: 'Cancelada',
};

const STATUS_VARIANT: Record<requisitionsApi.RequisitionStatus, 'secondary' | 'success' | 'warning' | 'destructive'> = {
  draft: 'secondary',
  pending: 'warning',
  approved: 'success',
  ordered: 'secondary',
  partial: 'warning',
  received: 'success',
  canceled: 'destructive',
};

const PRIORITY_LABEL: Record<requisitionsApi.RequisitionPriority, string> = {
  normal: 'Normal',
  urgent: 'Urgente',
  emergency: 'Emergencial',
};

const requisitionItemSchema = z.object({
  item_id: z.string().min(1, 'Selecione um item.'),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero.'),
  unit: z.string().optional(),
});

const requisitionSchema = z.object({
  priority: z.enum(['normal', 'urgent', 'emergency']),
  notes: z.string().optional(),
  items: z.array(requisitionItemSchema).min(1, 'Adicione ao menos um item.'),
});

type RequisitionFormData = z.infer<typeof requisitionSchema>;

/**
 * Requisição de compra filtrada por departamento (Bloco E,
 * `docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md`) — cada área
 * (Logística, Produção, Manutenção, Qualidade) enxerga só as próprias
 * requisições, resolvendo `department_id` automaticamente a partir do
 * `Employee` vinculado ao usuário logado (`useMyDepartment`). A aprovação e
 * conversão em pedido de compra continuam centralizadas em Compras
 * (`RequisitionsPage`, fila única) — esta tela é só criação/acompanhamento
 * pelo solicitante do departamento.
 *
 * Origem fixa por instância (ex.: `manutencao`) marca a requisição para
 * facilitar o rastreamento, mas o filtro real de listagem é por
 * `department_id`, não por `origin`.
 */
export function DepartmentRequisitionsPage({
  title,
  description,
  icon: Icon = ClipboardList,
  origin,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  origin?: string;
}) {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const { departmentId, departmentName, isLoading: isLoadingDepartment } = useMyDepartment();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<requisitionsApi.RequisitionStatus | ''>('');
  const [page, setPage] = React.useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['purchase-requisitions', 'by-department', departmentId, page, statusFilter],
    queryFn: () =>
      requisitionsApi.listPurchaseRequisitions({
        limit: 20,
        page,
        status: statusFilter || undefined,
        department_id: departmentId ?? undefined,
      }),
    enabled: !isLoadingDepartment,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RequisitionFormData>({
    resolver: zodResolver(requisitionSchema),
    defaultValues: { priority: 'normal', items: [{ item_id: '', quantity: 1, unit: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const createMutation = useMutation({
    mutationFn: (values: RequisitionFormData) =>
      requisitionsApi.createPurchaseRequisition({
        priority: values.priority,
        origin,
        notes: values.notes || undefined,
        status: 'pending',
        items: values.items.map((item) => ({
          item_id: item.item_id,
          quantity: item.quantity,
          unit: item.unit || undefined,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });
      setOpen(false);
      reset({ priority: 'normal', notes: '', items: [{ item_id: '', quantity: 1, unit: '' }] });
      setFormError(null);
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível criar a requisição')),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Icon className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
            {departmentName && (
              <p className="text-xs text-muted-foreground">Departamento: {departmentName}</p>
            )}
          </div>
        </div>
        {canWrite && (
          <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
              setOpen(nextOpen);
              if (!nextOpen) setFormError(null);
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus /> Nova requisição
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nova requisição de compra</DialogTitle>
              </DialogHeader>
              <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => createMutation.mutate(values))} noValidate>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="priority">Prioridade</Label>
                  <SelectNative id="priority" {...register('priority')}>
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgente</option>
                    <option value="emergency">Emergencial</option>
                  </SelectNative>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="notes">Observações</Label>
                  <Input id="notes" {...register('notes')} />
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Itens</Label>
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2">
                      <div className="flex-1">
                        <Controller
                          control={control}
                          name={`items.${index}.item_id`}
                          render={({ field: controllerField }) => (
                            <ItemSearchSelect
                              value={null}
                              onChange={(item) => controllerField.onChange(item?.id ?? '')}
                              placeholder="Item..."
                            />
                          )}
                        />
                      </div>
                      <Input type="number" step="any" placeholder="Qtd." className="w-24" {...register(`items.${index}.quantity`)} />
                      <Input placeholder="Unid." className="w-20" {...register(`items.${index}.unit`)} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                  {errors.items?.message && <p className="text-sm text-destructive">{errors.items.message}</p>}
                  {errors.items?.root?.message && <p className="text-sm text-destructive">{errors.items.root.message}</p>}
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ item_id: '', quantity: 1, unit: '' })}>
                    <Plus className="size-3" /> Adicionar item
                  </Button>
                </div>

                {formError && <DidacticAlert error={formError} />}
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                    {isSubmitting ? 'Salvando...' : 'Criar requisição'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor="status-filter" className="text-sm text-muted-foreground">
          Status
        </Label>
        <SelectNative
          id="status-filter"
          className="max-w-52"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as requisitionsApi.RequisitionStatus | '');
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Requisição</TableHead>
            <TableHead>Solicitante</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(isLoading || isLoadingDepartment) && <TableSkeletonRows columns={5} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-destructive">
                Não foi possível carregar as requisições. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((requisition) => (
            <TableRow key={requisition.id}>
              <TableCell className="font-medium">{requisition.requisition_number ?? requisition.id}</TableCell>
              <TableCell>{requisition.requester?.name ?? '-'}</TableCell>
              <TableCell>{PRIORITY_LABEL[requisition.priority]}</TableCell>
              <TableCell>{new Date(requisition.request_date).toLocaleDateString('pt-BR')}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[requisition.status]}>{STATUS_LABEL[requisition.status]}</Badge>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isLoadingDepartment && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Nenhuma requisição registrada para o seu departamento.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />
    </div>
  );
}
