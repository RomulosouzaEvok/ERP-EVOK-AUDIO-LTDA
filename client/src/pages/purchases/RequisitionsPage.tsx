import * as React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Eye, ShoppingCart } from 'lucide-react';

import * as requisitionsApi from '@/api/purchaseRequisitions';
import * as suppliersApi from '@/api/suppliers';
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
import { DidacticAlert } from '@/components/DidacticAlert';
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
  origin: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(requisitionItemSchema).min(1, 'Adicione ao menos um item.'),
});

type RequisitionFormData = z.infer<typeof requisitionSchema>;

/** Requisições de compra — origem obrigatória da cadeia de suprimentos (rastreabilidade 100%). */
export default function RequisitionsPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const isAdmin = hasRole('admin');
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<requisitionsApi.RequisitionStatus | ''>('');
  const [detailsRequisition, setDetailsRequisition] = React.useState<requisitionsApi.PurchaseRequisition | null>(null);
  const [convertingRequisition, setConvertingRequisition] = React.useState<requisitionsApi.PurchaseRequisition | null>(null);
  const [page, setPage] = React.useState(1);
  const [statusError, setStatusError] = React.useState<DidacticError | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['purchase-requisitions', page, statusFilter],
    queryFn: () =>
      requisitionsApi.listPurchaseRequisitions({ limit: 20, page, status: statusFilter || undefined }),
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

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });

  const createMutation = useMutation({
    mutationFn: (values: RequisitionFormData) =>
      requisitionsApi.createPurchaseRequisition({
        priority: values.priority,
        origin: values.origin || undefined,
        notes: values.notes || undefined,
        status: 'pending',
        items: values.items.map((item) => ({
          item_id: item.item_id,
          quantity: item.quantity,
          unit: item.unit || undefined,
        })),
      }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      reset({ priority: 'normal', origin: '', notes: '', items: [{ item_id: '', quantity: 1, unit: '' }] });
      setFormError(null);
    },
    onError: (error) => setFormError(extractApiErrorMessage(error)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'approved' | 'canceled' | 'pending'; requisitionLabel: string }) =>
      requisitionsApi.updateRequisitionStatus(id, status),
    onSuccess: () => {
      setStatusError(null);
      invalidate();
    },
    onError: (error, variables) =>
      setStatusError(
        translateApiError(error, `Não é possível alterar a Requisição ${variables.requisitionLabel}`, 'approve-requisition'),
      ),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Requisições de compra</h1>
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="priority">Prioridade</Label>
                    <SelectNative id="priority" {...register('priority')}>
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgente</option>
                      <option value="emergency">Emergencial</option>
                    </SelectNative>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="origin">Origem</Label>
                    <Input id="origin" placeholder="Ex.: MRP, Estoque baixo, OP..." {...register('origin')} />
                  </div>
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

                {formError && <p className="text-sm text-destructive">{formError}</p>}
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

      {statusError && <DidacticAlert error={statusError} />}

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
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-destructive">
                Não foi possível carregar as requisições de compra. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((requisition) => (
            <TableRow
              key={requisition.id}
              className="cursor-pointer hover:bg-accent/50"
              onClick={() => setDetailsRequisition(requisition)}
            >
              <TableCell className="font-medium">{requisition.requisition_number ?? requisition.id}</TableCell>
              <TableCell>{requisition.requester?.name ?? '-'}</TableCell>
              <TableCell>{PRIORITY_LABEL[requisition.priority]}</TableCell>
              <TableCell>{new Date(requisition.request_date).toLocaleDateString('pt-BR')}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[requisition.status]}>{STATUS_LABEL[requisition.status]}</Badge>
              </TableCell>
              {canWrite && (
                <TableCell className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                  <Button size="sm" variant="ghost" onClick={() => setDetailsRequisition(requisition)}>
                    <Eye className="size-4" /> Detalhes
                  </Button>
                  {isAdmin && requisition.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setStatusError(null);
                        statusMutation.mutate({
                          id: requisition.id,
                          status: 'approved',
                          requisitionLabel: String(requisition.requisition_number ?? requisition.id),
                        });
                      }}
                    >
                      Aprovar
                    </Button>
                  )}
                  {requisition.status === 'approved' && (
                    <Button size="sm" variant="default" onClick={() => setConvertingRequisition(requisition)}>
                      <ShoppingCart className="size-4" /> Gerar Pedido de Compra
                    </Button>
                  )}
                  {requisition.status !== 'canceled' && requisition.status !== 'received' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (window.confirm(`Cancelar a requisição ${requisition.requisition_number ?? requisition.id}?`)) {
                          setStatusError(null);
                          statusMutation.mutate({
                            id: requisition.id,
                            status: 'canceled',
                            requisitionLabel: String(requisition.requisition_number ?? requisition.id),
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
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhuma requisição registrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <RequisitionDetailSheet requisition={detailsRequisition} onClose={() => setDetailsRequisition(null)} />
      <ConvertRequisitionDialog requisition={convertingRequisition} onClose={() => setConvertingRequisition(null)} />
    </div>
  );
}

function RequisitionDetailSheet({
  requisition,
  onClose,
}: {
  requisition: requisitionsApi.PurchaseRequisition | null;
  onClose: () => void;
}) {
  const items = requisition?.items ?? [];

  return (
    <Sheet open={Boolean(requisition)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        {requisition && (
          <>
            <SheetHeader>
              <SheetTitle>Requisição {requisition.requisition_number ?? `#${requisition.id}`}</SheetTitle>
              <SheetDescription>Detalhes completos da requisição de compra.</SheetDescription>
            </SheetHeader>

            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Solicitante" value={requisition.requester?.name ?? '-'} />
              <DetailField
                label="Status"
                value={<Badge variant={STATUS_VARIANT[requisition.status]}>{STATUS_LABEL[requisition.status]}</Badge>}
              />
              <DetailField label="Prioridade" value={PRIORITY_LABEL[requisition.priority]} />
              <DetailField label="Data da solicitação" value={new Date(requisition.request_date).toLocaleDateString('pt-BR')} />
              <DetailField label="Origem" value={requisition.origin ?? 'Não informada'} />
              <DetailField label="Observações" value={requisition.notes ?? 'Nenhuma'} />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">Itens da requisição</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qtd.</TableHead>
                    <TableHead>Unid.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.item ? `${item.item.codigo} — ${item.item.descricao}` : item.item_id}</TableCell>
                      <TableCell>{Number(item.quantity)}</TableCell>
                      <TableCell>{item.unit ?? '-'}</TableCell>
                    </TableRow>
                  ))}
    {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Itens não disponíveis.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Conversão de requisição aprovada em um ou mais pedidos de compra (agrupados por fornecedor). */
function ConvertRequisitionDialog({
  requisition,
  onClose,
}: {
  requisition: requisitionsApi.PurchaseRequisition | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [fallbackSupplierId, setFallbackSupplierId] = React.useState<string>('');
  const [notes, setNotes] = React.useState('');
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [result, setResult] = React.useState<requisitionsApi.ConvertRequisitionResult | null>(null);

  React.useEffect(() => {
    if (requisition) {
      setFallbackSupplierId('');
      setNotes('');
      setError(null);
      setResult(null);
    }
  }, [requisition]);

  const { data: suppliers, isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['suppliers-all'],
    queryFn: () => suppliersApi.listSuppliers({ limit: 200 }),
    enabled: Boolean(requisition),
  });

  const convertMutation = useMutation({
    mutationFn: () => {
      if (!requisition) return Promise.reject(new Error('Requisição não selecionada.'));
      return requisitionsApi.convertRequisitionToPurchaseOrders(requisition.id, {
        fallback_supplier_id: fallbackSupplierId ? Number(fallbackSupplierId) : undefined,
        notes: notes || undefined,
      });
    },
    onSuccess: (data) => {
      setError(null);
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
    },
    onError: (err) => {
      setResult(null);
      setError(
        translateApiError(
          err,
          `Não é possível converter a Requisição ${requisition?.requisition_number ?? `#${requisition?.id}`} em pedido de compra`,
          'convert-requisition',
        ),
      );
    },
  });

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) onClose();
  };

  const items = requisition?.items ?? [];

  return (
    <Dialog open={Boolean(requisition)} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Gerar pedido de compra — {requisition?.requisition_number ?? `#${requisition?.id}`}
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              {result.purchase_orders.length === 1
                ? '1 pedido de compra foi gerado com sucesso:'
                : `${result.purchase_orders.length} pedidos de compra foram gerados (agrupados por fornecedor):`}
            </p>
            <ul className="list-disc pl-5 text-sm">
              {result.purchase_orders.map((order) => (
                <li key={order.id} className="font-medium">
                  {order.order_number}
                </li>
              ))}
            </ul>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
              <Button asChild>
                <Link to="/purchases" onClick={onClose}>
                  Ver pedidos de compra
                </Link>
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">Itens da requisição</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qtd.</TableHead>
                    <TableHead>Unid.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.item ? `${item.item.codigo} — ${item.item.descricao}` : item.item_id}</TableCell>
                      <TableCell>{Number(item.quantity)}</TableCell>
                      <TableCell>{item.unit ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Itens não disponíveis.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fallback-supplier">Fornecedor padrão (fallback)</Label>
              <SelectNative
                id="fallback-supplier"
                value={fallbackSupplierId}
                onChange={(event) => setFallbackSupplierId(event.target.value)}
                disabled={isLoadingSuppliers}
              >
                <option value="">Nenhum (usar fornecedor de cada item)</option>
                {suppliers?.data.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.trade_name || supplier.company_name}
                  </option>
                ))}
              </SelectNative>
              <p className="text-xs text-muted-foreground">
                Usado apenas para itens sem fornecedor resolvível automaticamente.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="convert-notes">Observações</Label>
              <Input
                id="convert-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Opcional"
              />
            </div>

            {error && <DidacticAlert error={error} />}

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={convertMutation.isPending}>
                Cancelar
              </Button>
              <Button onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending}>
                {convertMutation.isPending ? 'Gerando...' : 'Confirmar e gerar pedido(s)'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
