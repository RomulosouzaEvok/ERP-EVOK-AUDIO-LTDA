import * as React from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Eye, FileSpreadsheet, Send, Trophy } from 'lucide-react';

import * as rfqApi from '@/api/rfq';
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
import { DetailField } from '@/components/DetailField';
import { DidacticAlert } from '@/components/DidacticAlert';
import { ItemSearchSelect } from '@/components/ItemSearchSelect';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<rfqApi.RfqStatus, string> = {
  draft: 'Rascunho',
  sent: 'Enviada',
  quoted: 'Cotada',
  awarded: 'Adjudicada',
  cancelled: 'Cancelada',
};

const STATUS_VARIANT: Record<rfqApi.RfqStatus, 'secondary' | 'warning' | 'default' | 'success' | 'destructive'> = {
  draft: 'secondary',
  sent: 'warning',
  quoted: 'default',
  awarded: 'success',
  cancelled: 'destructive',
};

const createRfqItemSchema = z.object({
  item_id: z.string().min(1, 'Selecione um item.'),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero.'),
  unit: z.string().optional(),
});

const createRfqSchema = z
  .object({
    source: z.enum(['ad_hoc', 'requisition']),
    requisition_id: z.string().optional(),
    response_deadline: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(createRfqItemSchema).optional(),
  })
  .refine((data) => data.source !== 'requisition' || Boolean(data.requisition_id), {
    message: 'Selecione uma requisição de origem.',
    path: ['requisition_id'],
  })
  .refine((data) => data.source !== 'ad_hoc' || (data.items && data.items.length > 0), {
    message: 'Adicione ao menos um item.',
    path: ['items'],
  });

type CreateRfqFormData = z.infer<typeof createRfqSchema>;

/**
 * `/purchases/rfqs` — Cotação/RFQ multi-fornecedor: cria cotações (avulsas
 * ou a partir de requisição aprovada), convida fornecedores, registra
 * respostas de cotação, exibe o mapa comparativo e adjudica (gerando
 * pedido(s) de compra e realimentando o catálogo item x fornecedor).
 */
export default function RfqPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<rfqApi.RfqStatus | ''>('');
  const [page, setPage] = React.useState(1);
  const [detailRfqId, setDetailRfqId] = React.useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['rfqs', page, statusFilter],
    queryFn: () => rfqApi.listRfqs({ limit: 20, page, status: statusFilter || undefined }),
  });

  const { data: requisitions } = useQuery({
    queryKey: ['requisitions-for-rfq'],
    queryFn: () => requisitionsApi.listPurchaseRequisitions({ limit: 100 }),
    enabled: open,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateRfqFormData>({
    resolver: zodResolver(createRfqSchema),
    defaultValues: { source: 'ad_hoc', requisition_id: '', response_deadline: '', notes: '', items: [{ item_id: '', quantity: 1, unit: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const source = watch('source');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['rfqs'] });

  const createMutation = useMutation({
    mutationFn: (values: CreateRfqFormData) => {
      const base = {
        response_deadline: values.response_deadline || undefined,
        notes: values.notes || undefined,
      };
      if (values.source === 'requisition') {
        return rfqApi.createRfq({ ...base, requisition_id: Number(values.requisition_id) });
      }
      return rfqApi.createRfq({
        ...base,
        items: (values.items ?? []).map((item) => ({ item_id: item.item_id, quantity: item.quantity, unit: item.unit || undefined })),
      });
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      reset({ source: 'ad_hoc', requisition_id: '', response_deadline: '', notes: '', items: [{ item_id: '', quantity: 1, unit: '' }] });
      setFormError(null);
    },
    onError: (error) => setFormError(extractApiErrorMessage(error)),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <FileSpreadsheet className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Cotação (RFQ)</h1>
            <p className="text-sm text-muted-foreground">Cotação multi-fornecedor com mapa comparativo e adjudicação.</p>
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
                <Plus /> Nova cotação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nova cotação (RFQ)</DialogTitle>
              </DialogHeader>
              <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => createMutation.mutate(values))} noValidate>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="source">Origem dos itens</Label>
                  <SelectNative id="source" {...register('source')}>
                    <option value="ad_hoc">Avulsa (informar itens manualmente)</option>
                    <option value="requisition">A partir de requisição de compra</option>
                  </SelectNative>
                </div>

                {source === 'requisition' ? (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="requisition_id">Requisição de origem</Label>
                    <SelectNative id="requisition_id" {...register('requisition_id')} defaultValue="">
                      <option value="">Selecione...</option>
                      {requisitions?.data.map((requisition) => (
                        <option key={requisition.id} value={requisition.id}>
                          {requisition.requisition_number ?? `#${requisition.id}`} — {STATUS_LABEL_PT(requisition.status)}
                        </option>
                      ))}
                    </SelectNative>
                    {errors.requisition_id?.message && <p className="text-sm text-destructive">{errors.requisition_id.message}</p>}
                    <p className="text-xs text-muted-foreground">Os itens da requisição serão puxados automaticamente.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Label>Itens</Label>
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-end gap-2">
                        <div className="flex-1">
                          <Controller
                            control={control}
                            name={`items.${index}.item_id`}
                            render={({ field: controllerField }) => (
                              <ItemSearchSelect value={null} onChange={(item) => controllerField.onChange(item?.id ?? '')} placeholder="Item..." />
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
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ item_id: '', quantity: 1, unit: '' })}>
                      <Plus className="size-3" /> Adicionar item
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="response_deadline">Prazo de resposta</Label>
                    <Input id="response_deadline" type="date" {...register('response_deadline')} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="notes">Observações</Label>
                    <Input id="notes" {...register('notes')} />
                  </div>
                </div>

                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                    {isSubmitting ? 'Salvando...' : 'Criar cotação'}
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
            setStatusFilter(event.target.value as rfqApi.RfqStatus | '');
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
            <TableHead>Cotação</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Criado por</TableHead>
            <TableHead>Prazo de resposta</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-destructive">
                Não foi possível carregar as cotações. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((rfq) => (
            <TableRow
              key={rfq.id}
              className="cursor-pointer border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5"
              onClick={() => setDetailRfqId(rfq.id)}
            >
              <TableCell className="font-medium">{rfq.rfq_number}</TableCell>
              <TableCell>{rfq.requisition ? rfq.requisition.requisition_number : 'Avulsa'}</TableCell>
              <TableCell>{rfq.createdBy?.name ?? '-'}</TableCell>
              <TableCell>{rfq.response_deadline ? new Date(rfq.response_deadline).toLocaleDateString('pt-BR') : '-'}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[rfq.status]}>{STATUS_LABEL[rfq.status]}</Badge>
              </TableCell>
              <TableCell onClick={(event) => event.stopPropagation()}>
                <Button size="sm" variant="ghost" onClick={() => setDetailRfqId(rfq.id)}>
                  <Eye className="size-4" /> Detalhes
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhuma cotação registrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <RfqDetailDialog rfqId={detailRfqId} onClose={() => setDetailRfqId(null)} />
    </div>
  );
}

function STATUS_LABEL_PT(status: string): string {
  const map: Record<string, string> = {
    draft: 'rascunho',
    pending: 'pendente',
    approved: 'aprovada',
    ordered: 'em compra',
    partial: 'recebido parcial',
    received: 'recebida',
    canceled: 'cancelada',
  };
  return map[status] ?? status;
}

type DetailTab = 'items' | 'suppliers' | 'quote' | 'comparison';

function RfqDetailDialog({ rfqId, onClose }: { rfqId: number | null; onClose: () => void }) {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const [tab, setTab] = React.useState<DetailTab>('items');

  const { data: rfq, isLoading } = useQuery({
    queryKey: ['rfq', rfqId],
    queryFn: () => rfqApi.getRfqById(rfqId as number),
    enabled: rfqId != null,
  });

  React.useEffect(() => {
    if (rfqId != null) setTab('items');
  }, [rfqId]);

  return (
    <Dialog open={rfqId != null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {rfq ? rfq.rfq_number : 'Cotação'}
            {rfq && <Badge variant={STATUS_VARIANT[rfq.status]}>{STATUS_LABEL[rfq.status]}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {rfq && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
              <DetailField label="Origem" value={rfq.requisition ? rfq.requisition.requisition_number : 'Avulsa'} />
              <DetailField label="Criado por" value={rfq.createdBy?.name ?? '-'} />
              <DetailField label="Prazo de resposta" value={rfq.response_deadline ? new Date(rfq.response_deadline).toLocaleDateString('pt-BR') : 'Não informado'} />
            </div>

            <div className="flex gap-1 border-b">
              <TabButton active={tab === 'items'} onClick={() => setTab('items')}>
                Itens
              </TabButton>
              <TabButton active={tab === 'suppliers'} onClick={() => setTab('suppliers')}>
                Fornecedores convidados
              </TabButton>
              {canWrite && (
                <TabButton active={tab === 'quote'} onClick={() => setTab('quote')}>
                  Registrar cotação
                </TabButton>
              )}
              <TabButton active={tab === 'comparison'} onClick={() => setTab('comparison')}>
                Mapa comparativo
              </TabButton>
            </div>

            {tab === 'items' && <ItemsTab rfq={rfq} />}
            {tab === 'suppliers' && <SuppliersTab rfq={rfq} canWrite={canWrite} />}
            {tab === 'quote' && canWrite && <QuoteTab rfq={rfq} />}
            {tab === 'comparison' && <ComparisonTab rfq={rfq} onClose={onClose} />}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        'rounded-none border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-brand/5 hover:text-brand',
        active && 'border-brand text-brand',
      )}
    >
      {children}
    </Button>
  );
}

function ItemsTab({ rfq }: { rfq: rfqApi.Rfq }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead className="text-right">Qtd.</TableHead>
          <TableHead>Unid.</TableHead>
          <TableHead>Adjudicado a</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rfq.items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.item ? `${item.item.codigo} — ${item.item.descricao}` : item.item_id}</TableCell>
            <TableCell className="text-right tabular-nums">{Number(item.quantity)}</TableCell>
            <TableCell>{item.unit ?? '-'}</TableCell>
            <TableCell>
              {item.awarded_supplier_id
                ? `Fornecedor #${item.awarded_supplier_id} — R$ ${Number(item.awarded_unit_price).toFixed(2)}`
                : '-'}
            </TableCell>
          </TableRow>
        ))}
        {rfq.items.length === 0 && (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              Nenhum item.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function SuppliersTab({ rfq, canWrite }: { rfq: rfqApi.Rfq; canWrite: boolean }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = React.useState<number[]>([]);
  const [error, setError] = React.useState<DidacticError | null>(null);

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers-all-rfq'],
    queryFn: () => suppliersApi.listSuppliers({ limit: 200 }),
  });

  const invitedIds = new Set(rfq.suppliers.map((s) => s.supplier_id));
  const invitable = (suppliers?.data ?? []).filter((s) => !invitedIds.has(s.id));

  const inviteMutation = useMutation({
    mutationFn: () => rfqApi.inviteRfqSuppliers(rfq.id, selected),
    onSuccess: () => {
      setError(null);
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ['rfq', rfq.id] });
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
    },
    onError: (err) => setError(translateApiError(err, `Não é possível convidar fornecedores para a cotação ${rfq.rfq_number}`)),
  });

  const canInvite = canWrite && rfq.status !== 'awarded' && rfq.status !== 'cancelled';

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Respondido em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rfq.suppliers.map((supplierInvite) => (
            <TableRow key={supplierInvite.id}>
              <TableCell>{supplierInvite.supplier?.company_name ?? `Fornecedor #${supplierInvite.supplier_id}`}</TableCell>
              <TableCell>
                <Badge variant={supplierInvite.status === 'responded' ? 'success' : supplierInvite.status === 'declined' ? 'destructive' : 'warning'}>
                  {supplierInvite.status === 'responded' ? 'Respondeu' : supplierInvite.status === 'declined' ? 'Recusou' : 'Convidado'}
                </Badge>
              </TableCell>
              <TableCell>{supplierInvite.responded_at ? new Date(supplierInvite.responded_at).toLocaleDateString('pt-BR') : '-'}</TableCell>
            </TableRow>
          ))}
          {rfq.suppliers.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                Nenhum fornecedor convidado ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {canInvite && (
        <div className="flex flex-col gap-2 rounded-md border p-3">
          <p className="text-sm font-semibold">Convidar novos fornecedores</p>
          {isLoading && <p className="text-sm text-muted-foreground">Carregando fornecedores...</p>}
          <div className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto">
            {invitable.map((supplier) => (
              <label key={supplier.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={selected.includes(supplier.id)}
                  onChange={(event) =>
                    setSelected((prev) => (event.target.checked ? [...prev, supplier.id] : prev.filter((id) => id !== supplier.id)))
                  }
                />
                {supplier.trade_name || supplier.company_name}
              </label>
            ))}
            {!isLoading && invitable.length === 0 && <p className="text-sm text-muted-foreground">Todos os fornecedores já foram convidados.</p>}
          </div>
          {error && <DidacticAlert error={error} />}
          <Button
            type="button"
            size="sm"
            className="w-fit"
            disabled={selected.length === 0 || inviteMutation.isPending}
            onClick={() => inviteMutation.mutate()}
          >
            <Send className="size-4" /> Convidar selecionados ({selected.length})
          </Button>
        </div>
      )}
    </div>
  );
}

interface QuoteFieldState {
  unit_price: string;
  lead_time_days: string;
  moq: string;
  validity_date: string;
  notes: string;
}

function QuoteTab({ rfq }: { rfq: rfqApi.Rfq }) {
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = React.useState<string>('');
  const [values, setValues] = React.useState<Record<number, QuoteFieldState>>({});
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [success, setSuccess] = React.useState(false);

  const invitedSuppliers = rfq.suppliers;

  React.useEffect(() => {
    if (!supplierId) {
      setValues({});
      return;
    }
    const numericSupplierId = Number(supplierId);
    const prefilled: Record<number, QuoteFieldState> = {};
    for (const item of rfq.items) {
      const existingQuote = item.quotes?.find((q) => q.supplier_id === numericSupplierId);
      prefilled[item.id] = {
        unit_price: existingQuote ? String(existingQuote.unit_price) : '',
        lead_time_days: existingQuote?.lead_time_days != null ? String(existingQuote.lead_time_days) : '',
        moq: existingQuote?.moq != null ? String(existingQuote.moq) : '',
        validity_date: existingQuote?.validity_date ?? '',
        notes: existingQuote?.notes ?? '',
      };
    }
    setValues(prefilled);
  }, [supplierId, rfq.items]);

  const registerMutation = useMutation({
    mutationFn: () => {
      const items = Object.entries(values)
        .filter(([, field]) => field.unit_price.trim() !== '')
        .map(([rfqItemId, field]) => ({
          rfq_item_id: Number(rfqItemId),
          unit_price: Number(field.unit_price),
          lead_time_days: field.lead_time_days ? Number(field.lead_time_days) : undefined,
          moq: field.moq ? Number(field.moq) : undefined,
          validity_date: field.validity_date || undefined,
          notes: field.notes || undefined,
        }));
      return rfqApi.registerRfqQuote(rfq.id, { supplier_id: Number(supplierId), items });
    },
    onSuccess: () => {
      setError(null);
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['rfq', rfq.id] });
      queryClient.invalidateQueries({ queryKey: ['rfq-comparison', rfq.id] });
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
    },
    onError: (err) => {
      setSuccess(false);
      setError(translateApiError(err, `Não é possível registrar a cotação na RFQ ${rfq.rfq_number}`));
    },
  });

  if (rfq.suppliers.length === 0) {
    return <p className="text-sm text-muted-foreground">Convide ao menos um fornecedor antes de registrar uma cotação.</p>;
  }

  const hasAnyPrice = Object.values(values).some((field) => field.unit_price.trim() !== '');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="quote-supplier">Fornecedor que respondeu</Label>
        <SelectNative
          id="quote-supplier"
          value={supplierId}
          onChange={(event) => {
            setSupplierId(event.target.value);
            setSuccess(false);
          }}
        >
          <option value="">Selecione...</option>
          {invitedSuppliers.map((invite) => (
            <option key={invite.supplier_id} value={invite.supplier_id}>
              {invite.supplier?.company_name ?? `Fornecedor #${invite.supplier_id}`}
            </option>
          ))}
        </SelectNative>
      </div>

      {supplierId && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="w-28">Preço unit.</TableHead>
              <TableHead className="w-24">Prazo (d)</TableHead>
              <TableHead className="w-24">MOQ</TableHead>
              <TableHead className="w-36">Validade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rfq.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.item ? `${item.item.codigo} — ${item.item.descricao}` : item.item_id}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="any"
                    value={values[item.id]?.unit_price ?? ''}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] ?? emptyQuoteField()), unit_price: event.target.value } }))
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={values[item.id]?.lead_time_days ?? ''}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] ?? emptyQuoteField()), lead_time_days: event.target.value } }))
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="any"
                    value={values[item.id]?.moq ?? ''}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] ?? emptyQuoteField()), moq: event.target.value } }))
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={values[item.id]?.validity_date ?? ''}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] ?? emptyQuoteField()), validity_date: event.target.value } }))
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {success && <p className="text-sm text-emerald-600">Cotação registrada com sucesso.</p>}
      {error && <DidacticAlert error={error} />}

      <Button
        type="button"
        className="w-fit"
        disabled={!supplierId || !hasAnyPrice || registerMutation.isPending}
        onClick={() => registerMutation.mutate()}
      >
        {registerMutation.isPending ? 'Salvando...' : 'Salvar cotação'}
      </Button>
    </div>
  );
}

function emptyQuoteField(): QuoteFieldState {
  return { unit_price: '', lead_time_days: '', moq: '', validity_date: '', notes: '' };
}

function ComparisonTab({ rfq, onClose }: { rfq: rfqApi.Rfq; onClose: () => void }) {
  const { hasRole, permissions } = useAuth();
  const canAward = hasRole('admin') || permissions?.compras === 'approve';
  const queryClient = useQueryClient();
  const [selections, setSelections] = React.useState<Record<number, string>>({});
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [result, setResult] = React.useState<rfqApi.AwardRfqResult | null>(null);

  const { data: comparison, isLoading } = useQuery({
    queryKey: ['rfq-comparison', rfq.id],
    queryFn: () => rfqApi.getRfqComparison(rfq.id),
  });

  React.useEffect(() => {
    if (!comparison) return;
    setSelections((prev) => {
      const next = { ...prev };
      for (const item of comparison.items) {
        if (next[item.rfq_item_id]) continue;
        const bestQuote = item.quotes.find((q) => q.is_best_price) ?? item.quotes[0];
        if (bestQuote) next[item.rfq_item_id] = String(bestQuote.supplier_id);
      }
      return next;
    });
  }, [comparison]);

  const awardMutation = useMutation({
    mutationFn: () => {
      const awards = Object.entries(selections)
        .filter(([, supplierId]) => supplierId)
        .map(([rfqItemId, supplierId]) => ({ rfq_item_id: Number(rfqItemId), supplier_id: Number(supplierId) }));
      return rfqApi.awardRfq(rfq.id, { awards });
    },
    onSuccess: (data) => {
      setError(null);
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['rfq', rfq.id] });
      queryClient.invalidateQueries({ queryKey: ['rfq-comparison', rfq.id] });
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
    },
    onError: (err) => setError(translateApiError(err, `Não é possível adjudicar a cotação ${rfq.rfq_number}`)),
  });

  if (isLoading || !comparison) {
    return <p className="text-sm text-muted-foreground">Carregando mapa comparativo...</p>;
  }

  if (result) {
    return (
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
        <Button asChild className="w-fit">
          <Link to="/purchases" onClick={onClose}>
            Ver pedidos de compra
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {comparison.items.map((item) => (
        <div key={item.rfq_item_id} className="flex flex-col gap-2 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              {item.item ? `${item.item.codigo} — ${item.item.descricao}` : item.item_id} ({item.quantity} {item.unit ?? ''})
            </p>
            {item.awarded_supplier_id && <Badge variant="success">Adjudicado</Badge>}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Preço unit.</TableHead>
                <TableHead className="text-right">Prazo</TableHead>
                <TableHead className="text-right">MOQ</TableHead>
                <TableHead className="text-right">Total</TableHead>
                {canAward && rfq.status === 'quoted' && <TableHead>Vencedor</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {item.quotes.map((quote) => (
                <TableRow key={quote.quote_id}>
                  <TableCell>{quote.supplier_name}</TableCell>
                  <TableCell className={cn('text-right tabular-nums', quote.is_best_price && 'font-semibold text-emerald-600')}>
                    R$ {quote.unit_price.toFixed(2)} {quote.is_best_price && <Trophy className="ml-1 inline size-3" />}
                  </TableCell>
                  <TableCell className={cn('text-right tabular-nums', quote.is_best_lead_time && 'font-semibold text-emerald-600')}>
                    {quote.lead_time_days ?? '-'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{quote.moq ?? '-'}</TableCell>
                  <TableCell className="text-right tabular-nums">R$ {quote.line_total.toFixed(2)}</TableCell>
                  {canAward && rfq.status === 'quoted' && (
                    <TableCell>
                      <input
                        type="radio"
                        name={`award-${item.rfq_item_id}`}
                        checked={selections[item.rfq_item_id] === String(quote.supplier_id)}
                        onChange={() => setSelections((prev) => ({ ...prev, [item.rfq_item_id]: String(quote.supplier_id) }))}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {item.quotes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canAward ? 6 : 5} className="text-center text-muted-foreground">
                    Nenhuma cotação recebida ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      ))}

      <div className="flex flex-col gap-2 rounded-md border p-3">
        <p className="text-sm font-semibold">Total por fornecedor</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fornecedor</TableHead>
              <TableHead className="text-right">Itens cotados</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparison.supplier_totals.map((total) => (
              <TableRow key={total.supplier_id}>
                <TableCell>{total.supplier_name}</TableCell>
                <TableCell className="text-right tabular-nums">{total.items_quoted_count}</TableCell>
                <TableCell className="text-right tabular-nums">R$ {total.total_amount.toFixed(2)}</TableCell>
              </TableRow>
            ))}
            {comparison.supplier_totals.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Nenhuma cotação recebida ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {canAward && rfq.status === 'quoted' && (
        <div className="flex flex-col gap-2">
          {error && <DidacticAlert error={error} />}
          <Button
            type="button"
            className="w-fit"
            disabled={Object.values(selections).filter(Boolean).length === 0 || awardMutation.isPending}
            onClick={() => awardMutation.mutate()}
          >
            <Trophy className="size-4" /> {awardMutation.isPending ? 'Adjudicando...' : 'Adjudicar'}
          </Button>
        </div>
      )}
      {rfq.status !== 'quoted' && rfq.status !== 'awarded' && (
        <p className="text-xs text-muted-foreground">A adjudicação fica disponível assim que ao menos uma cotação for registrada.</p>
      )}
    </div>
  );
}
