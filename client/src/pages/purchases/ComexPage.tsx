import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Eye, Container, Ship, PackageCheck, Ban } from 'lucide-react';

import * as comexApi from '@/api/comex';
import * as suppliersApi from '@/api/suppliers';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DetailField } from '@/components/DetailField';
import { DidacticAlert } from '@/components/DidacticAlert';
import { ItemSearchSelect } from '@/components/ItemSearchSelect';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';

const STATUS_LABEL: Record<comexApi.ImportProcessStatus, string> = {
  draft: 'Rascunho',
  shipped: 'Embarcado',
  arrived: 'Chegou ao país',
  customs_cleared: 'Desembaraçado',
  received: 'Recebido',
  cancelled: 'Cancelado',
};

const STATUS_VARIANT: Record<comexApi.ImportProcessStatus, 'secondary' | 'warning' | 'default' | 'success' | 'destructive'> = {
  draft: 'secondary',
  shipped: 'warning',
  arrived: 'warning',
  customs_cleared: 'default',
  received: 'success',
  cancelled: 'destructive',
};

/** Próximo marco de acompanhamento (`POST /:id/tracking`) a partir do status atual — `null` quando não há mais marco a registrar. */
const NEXT_TRACKING_EVENT: Partial<Record<comexApi.ImportProcessStatus, comexApi.ImportTrackingEvent>> = {
  draft: 'shipped',
  shipped: 'arrived',
  arrived: 'customs_cleared',
};

const TRACKING_EVENT_LABEL: Record<comexApi.ImportTrackingEvent, string> = {
  shipped: 'Embarque',
  arrived: 'Chegada ao país',
  customs_cleared: 'Desembaraço aduaneiro',
};

const createImportProcessItemSchema = z.object({
  item_id: z.string().min(1, 'Selecione um item.'),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero.'),
  fob_unit_price: z.coerce.number().nonnegative('Informe o preço FOB unitário.'),
  ii_rate: z.coerce.number().min(0).max(100),
  ipi_rate: z.coerce.number().min(0).max(100),
  pis_rate: z.coerce.number().min(0).max(100),
  cofins_rate: z.coerce.number().min(0).max(100),
  icms_rate: z.coerce.number().min(0).max(100),
});

const createImportProcessSchema = z.object({
  supplier_id: z.coerce.number().int().positive('Selecione um fornecedor.'),
  fob_currency: z.string().trim().length(3, 'Use o código ISO de 3 letras (ex.: USD).'),
  exchange_rate: z.coerce.number().positive('Informe o câmbio.'),
  freight_value: z.coerce.number().min(0),
  insurance_value: z.coerce.number().min(0),
  other_expenses_value: z.coerce.number().min(0),
  notes: z.string().optional(),
  items: z.array(createImportProcessItemSchema).min(1, 'Adicione ao menos um item.'),
});

type CreateImportProcessFormData = z.infer<typeof createImportProcessSchema>;

function emptyItem(): CreateImportProcessFormData['items'][number] {
  return { item_id: '', quantity: 1, fob_unit_price: 0, ii_rate: 0, ipi_rate: 0, pis_rate: 0, cofins_rate: 0, icms_rate: 0 };
}

/**
 * `/purchases/comex` — Importação (COMEX, UC-19): registra processos de
 * importação (fornecedor, itens com valor FOB, câmbio, frete/seguro/despesas),
 * calcula tributos de importação (II/IPI/PIS/COFINS/ICMS) e custo
 * nacionalizado por item, acompanha os marcos (embarque, chegada,
 * desembaraço) e dá entrada em estoque no recebimento.
 */
export default function ComexPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<comexApi.ImportProcessStatus | ''>('');
  const [page, setPage] = React.useState(1);
  const [detailId, setDetailId] = React.useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['import-processes', page, statusFilter],
    queryFn: () => comexApi.listImportProcesses({ limit: 20, page, status: statusFilter || undefined }),
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-all-comex'],
    queryFn: () => suppliersApi.listSuppliers({ limit: 200 }),
    enabled: open,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateImportProcessFormData>({
    resolver: zodResolver(createImportProcessSchema),
    defaultValues: {
      supplier_id: undefined,
      fob_currency: 'USD',
      exchange_rate: undefined,
      freight_value: 0,
      insurance_value: 0,
      other_expenses_value: 0,
      notes: '',
      items: [emptyItem()],
    } as never,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['import-processes'] });

  const createMutation = useMutation({
    mutationFn: (values: CreateImportProcessFormData) =>
      comexApi.createImportProcess({
        ...values,
        notes: values.notes?.trim() || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      reset({
        supplier_id: undefined,
        fob_currency: 'USD',
        exchange_rate: undefined,
        freight_value: 0,
        insurance_value: 0,
        other_expenses_value: 0,
        notes: '',
        items: [emptyItem()],
      } as never);
      setFormError(null);
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível registrar o processo de importação.')),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Container className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Importação (Comex)</h1>
            <p className="text-sm text-muted-foreground">
              Processos de importação, cálculo de tributos e custo nacionalizado, com entrada em estoque no recebimento.
            </p>
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
                <Plus /> Novo processo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Novo processo de importação</DialogTitle>
              </DialogHeader>
              <form
                className="flex flex-col gap-3"
                onSubmit={handleSubmit((values) => createMutation.mutate(values))}
                noValidate
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="supplier_id">Fornecedor</Label>
                    <SelectNative id="supplier_id" {...register('supplier_id')} defaultValue="">
                      <option value="" disabled>
                        Selecione...
                      </option>
                      {suppliers?.data.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.company_name}
                        </option>
                      ))}
                    </SelectNative>
                    {errors.supplier_id && <p className="text-sm text-destructive">{errors.supplier_id.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="fob_currency">Moeda FOB</Label>
                    <Input id="fob_currency" maxLength={3} placeholder="USD" {...register('fob_currency')} />
                    {errors.fob_currency && <p className="text-sm text-destructive">{errors.fob_currency.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="exchange_rate">Câmbio (→ BRL)</Label>
                    <Input id="exchange_rate" type="number" step="any" {...register('exchange_rate')} />
                    {errors.exchange_rate && <p className="text-sm text-destructive">{errors.exchange_rate.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="freight_value">Frete (R$)</Label>
                    <Input id="freight_value" type="number" step="any" {...register('freight_value')} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="insurance_value">Seguro (R$)</Label>
                    <Input id="insurance_value" type="number" step="any" {...register('insurance_value')} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="other_expenses_value">Outras despesas (R$)</Label>
                    <Input id="other_expenses_value" type="number" step="any" {...register('other_expenses_value')} />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Itens (valor FOB unitário na moeda estrangeira; alíquotas em %)</Label>
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-[1fr_repeat(7,5.5rem)_auto] items-end gap-1.5 rounded-md border p-2">
                      <Controller
                        control={control}
                        name={`items.${index}.item_id`}
                        render={({ field: controllerField }) => (
                          <ItemSearchSelect value={null} onChange={(item) => controllerField.onChange(item?.id ?? '')} placeholder="Item..." />
                        )}
                      />
                      <Input type="number" step="any" placeholder="Qtd." {...register(`items.${index}.quantity`)} />
                      <Input type="number" step="any" placeholder="FOB unit." {...register(`items.${index}.fob_unit_price`)} />
                      <Input type="number" step="any" placeholder="II %" {...register(`items.${index}.ii_rate`)} />
                      <Input type="number" step="any" placeholder="IPI %" {...register(`items.${index}.ipi_rate`)} />
                      <Input type="number" step="any" placeholder="PIS %" {...register(`items.${index}.pis_rate`)} />
                      <Input type="number" step="any" placeholder="COFINS %" {...register(`items.${index}.cofins_rate`)} />
                      <Input type="number" step="any" placeholder="ICMS %" {...register(`items.${index}.icms_rate`)} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                  {errors.items?.message && <p className="text-sm text-destructive">{errors.items.message}</p>}
                  <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => append(emptyItem())}>
                    <Plus className="size-3" /> Adicionar item
                  </Button>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="notes">Observações</Label>
                  <Input id="notes" {...register('notes')} />
                </div>

                {formError && <DidacticAlert error={formError} />}
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                    {isSubmitting ? 'Salvando...' : 'Registrar processo'}
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
            setStatusFilter(event.target.value as comexApi.ImportProcessStatus | '');
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
            <TableHead>Processo</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Moeda</TableHead>
            <TableHead className="text-right">Câmbio</TableHead>
            <TableHead>Criado por</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={7} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-destructive">
                Não foi possível carregar os processos de importação. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((importProcess) => (
            <TableRow
              key={importProcess.id}
              className="cursor-pointer border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5"
              onClick={() => setDetailId(importProcess.id)}
            >
              <TableCell className="font-medium">{importProcess.process_number}</TableCell>
              <TableCell>{importProcess.supplier?.company_name ?? `#${importProcess.supplier_id}`}</TableCell>
              <TableCell>{importProcess.fob_currency}</TableCell>
              <TableCell className="text-right tabular-nums">{Number(importProcess.exchange_rate).toFixed(4)}</TableCell>
              <TableCell>{importProcess.createdBy?.name ?? '-'}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[importProcess.status]}>{STATUS_LABEL[importProcess.status]}</Badge>
              </TableCell>
              <TableCell onClick={(event) => event.stopPropagation()}>
                <Button size="sm" variant="ghost" onClick={() => setDetailId(importProcess.id)}>
                  <Eye className="size-4" /> Detalhes
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Nenhum processo de importação registrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <ImportProcessDetailDialog importProcessId={detailId} onClose={() => setDetailId(null)} canWrite={canWrite} />
    </div>
  );
}

function ImportProcessDetailDialog({
  importProcessId,
  onClose,
  canWrite,
}: {
  importProcessId: number | null;
  onClose: () => void;
  canWrite: boolean;
}) {
  const queryClient = useQueryClient();
  const [trackingOpen, setTrackingOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);

  const { data: importProcess, isLoading } = useQuery({
    queryKey: ['import-process', importProcessId],
    queryFn: () => comexApi.getImportProcessById(importProcessId as number),
    enabled: importProcessId != null,
  });

  React.useEffect(() => {
    if (importProcessId != null) {
      setTrackingOpen(false);
      setCancelOpen(false);
      setActionError(null);
    }
  }, [importProcessId]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['import-processes'] });
    queryClient.invalidateQueries({ queryKey: ['import-process', importProcessId] });
  };

  const receiveMutation = useMutation({
    mutationFn: () => comexApi.receiveImportProcess(importProcessId as number),
    onSuccess: () => {
      setActionError(null);
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível receber o processo de importação (dar entrada em estoque).')),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => comexApi.cancelImportProcess(importProcessId as number, reason),
    onSuccess: () => {
      setActionError(null);
      setCancelOpen(false);
      invalidateAll();
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível cancelar o processo de importação.')),
  });

  const nextEvent = importProcess ? NEXT_TRACKING_EVENT[importProcess.status] : undefined;
  const canReceive = importProcess?.status === 'customs_cleared';
  const canCancel = importProcess && importProcess.status !== 'received' && importProcess.status !== 'cancelled';

  return (
    <Dialog open={importProcessId != null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {importProcess ? importProcess.process_number : 'Processo de importação'}
            {importProcess && <Badge variant={STATUS_VARIANT[importProcess.status]}>{STATUS_LABEL[importProcess.status]}</Badge>}
          </DialogTitle>
          <DialogDescription>Acompanhamento, tributos calculados e custo nacionalizado por item.</DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {importProcess && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
              <DetailField label="Fornecedor" value={importProcess.supplier?.company_name ?? `#${importProcess.supplier_id}`} />
              <DetailField label="Moeda FOB" value={importProcess.fob_currency} />
              <DetailField label="Câmbio (→ BRL)" value={Number(importProcess.exchange_rate).toFixed(6)} />
              <DetailField label="Frete (R$)" value={Number(importProcess.freight_value).toFixed(2)} />
              <DetailField label="Seguro (R$)" value={Number(importProcess.insurance_value).toFixed(2)} />
              <DetailField label="Outras despesas (R$)" value={Number(importProcess.other_expenses_value).toFixed(2)} />
              <DetailField label="Embarcado em" value={formatDate(importProcess.shipped_at)} />
              <DetailField label="Chegou em" value={formatDate(importProcess.arrived_at)} />
              <DetailField label="Desembaraçado em" value={formatDate(importProcess.customs_cleared_at)} />
              <DetailField label="Recebido em" value={formatDate(importProcess.received_at)} />
              <DetailField label="Criado por" value={importProcess.createdBy?.name ?? '-'} />
              {importProcess.notes && <DetailField label="Observações" value={importProcess.notes} />}
            </div>

            <div className="flex min-w-0 flex-col gap-2 overflow-x-auto">
              <p className="text-sm font-semibold">Itens e tributos calculados</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="text-right">FOB unit.</TableHead>
                    <TableHead className="text-right">Vlr. aduaneiro</TableHead>
                    <TableHead className="text-right">II</TableHead>
                    <TableHead className="text-right">IPI</TableHead>
                    <TableHead className="text-right">PIS</TableHead>
                    <TableHead className="text-right">COFINS</TableHead>
                    <TableHead className="text-right">ICMS</TableHead>
                    <TableHead className="text-right">Custo nacionalizado (unit.)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importProcess.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.item ? `${item.item.codigo} — ${item.item.descricao}` : item.item_id}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(item.quantity)}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(item.fob_unit_price).toFixed(4)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(item.customs_value)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(item.ii_value)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(item.ipi_value)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(item.pis_value)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(item.cofins_value)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(item.icms_value)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatMoney(item.nationalized_unit_cost)}</TableCell>
                    </TableRow>
                  ))}
                  {importProcess.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground">
                        Nenhum item.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground">
                Tributos calculados de forma simplificada (base fiscal padrão, sem integração Siscomex/NCM); recalculados a cada
                marco de acompanhamento com valores monetários atualizados e novamente no recebimento.
              </p>
            </div>

            {actionError && <DidacticAlert error={actionError} />}

            {canWrite && (
              <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                {nextEvent && (
                  <Button type="button" size="sm" onClick={() => setTrackingOpen(true)}>
                    <Ship className="size-4" /> Registrar {TRACKING_EVENT_LABEL[nextEvent].toLowerCase()}
                  </Button>
                )}
                {canReceive && (
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    disabled={receiveMutation.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Confirmar recebimento do processo ${importProcess.process_number}? Isso dará entrada em estoque com o custo nacionalizado calculado.`,
                        )
                      ) {
                        receiveMutation.mutate();
                      }
                    }}
                  >
                    <PackageCheck className="size-4" /> {receiveMutation.isPending ? 'Recebendo...' : 'Receber (entrada em estoque)'}
                  </Button>
                )}
                {canCancel && (
                  <Button type="button" size="sm" variant="destructive" onClick={() => setCancelOpen(true)}>
                    <Ban className="size-4" /> Cancelar processo
                  </Button>
                )}
              </div>
            )}

            {importProcess && nextEvent && (
              <RegisterTrackingDialog
                importProcess={importProcess}
                event={nextEvent}
                open={trackingOpen}
                onClose={() => setTrackingOpen(false)}
                onSuccess={invalidateAll}
              />
            )}

            <CancelImportProcessDialog
              open={cancelOpen}
              onClose={() => setCancelOpen(false)}
              onConfirm={(reason) => cancelMutation.mutate(reason)}
              isPending={cancelMutation.isPending}
              processNumber={importProcess.process_number}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface TrackingFormState {
  event_date: string;
  exchange_rate: string;
  freight_value: string;
  insurance_value: string;
  other_expenses_value: string;
  notes: string;
}

function emptyTrackingForm(): TrackingFormState {
  return { event_date: '', exchange_rate: '', freight_value: '', insurance_value: '', other_expenses_value: '', notes: '' };
}

/**
 * Diálogo de registro de acompanhamento (`POST /:id/tracking`). Usa estado
 * simples em vez de `react-hook-form`/`zod` — os campos monetários são
 * opcionais (string vazia = "não alterar"), o que colide com a inferência de
 * tipos do resolver do zod para uniões `number | undefined` (mesmo padrão já
 * usado em `ReceiveItemsDialog`, `PurchasesPage.tsx`).
 */
function RegisterTrackingDialog({
  importProcess,
  event,
  open,
  onClose,
  onSuccess,
}: {
  importProcess: comexApi.ImportProcess;
  event: comexApi.ImportTrackingEvent;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = React.useState<TrackingFormState>(emptyTrackingForm());
  const [error, setError] = React.useState<DidacticError | null>(null);

  React.useEffect(() => {
    if (open) {
      setForm(emptyTrackingForm());
      setError(null);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () =>
      comexApi.registerImportTracking(importProcess.id, {
        event,
        event_date: form.event_date || undefined,
        exchange_rate: form.exchange_rate ? Number(form.exchange_rate) : undefined,
        freight_value: form.freight_value ? Number(form.freight_value) : undefined,
        insurance_value: form.insurance_value ? Number(form.insurance_value) : undefined,
        other_expenses_value: form.other_expenses_value ? Number(form.other_expenses_value) : undefined,
        notes: form.notes.trim() || undefined,
      }),
    onSuccess: () => {
      setError(null);
      onClose();
      onSuccess();
    },
    onError: (err) =>
      setError(translateApiError(err, `Não foi possível registrar "${TRACKING_EVENT_LABEL[event]}" no processo ${importProcess.process_number}.`)),
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar {TRACKING_EVENT_LABEL[event].toLowerCase()}</DialogTitle>
          <DialogDescription>
            Os campos monetários são opcionais — se informados, todos os itens do processo são recalculados com os novos valores.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event_date">Data do evento</Label>
            <Input
              id="event_date"
              type="date"
              value={form.event_date}
              onChange={(evt) => setForm((prev) => ({ ...prev, event_date: evt.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tracking_exchange_rate">Novo câmbio (opcional)</Label>
              <Input
                id="tracking_exchange_rate"
                type="number"
                step="any"
                value={form.exchange_rate}
                onChange={(evt) => setForm((prev) => ({ ...prev, exchange_rate: evt.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tracking_freight_value">Novo frete R$ (opcional)</Label>
              <Input
                id="tracking_freight_value"
                type="number"
                step="any"
                value={form.freight_value}
                onChange={(evt) => setForm((prev) => ({ ...prev, freight_value: evt.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tracking_insurance_value">Novo seguro R$ (opcional)</Label>
              <Input
                id="tracking_insurance_value"
                type="number"
                step="any"
                value={form.insurance_value}
                onChange={(evt) => setForm((prev) => ({ ...prev, insurance_value: evt.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tracking_other_expenses_value">Outras despesas R$ (opcional)</Label>
              <Input
                id="tracking_other_expenses_value"
                type="number"
                step="any"
                value={form.other_expenses_value}
                onChange={(evt) => setForm((prev) => ({ ...prev, other_expenses_value: evt.target.value }))}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tracking_notes">Observações</Label>
            <Input
              id="tracking_notes"
              value={form.notes}
              onChange={(evt) => setForm((prev) => ({ ...prev, notes: evt.target.value }))}
            />
          </div>
          {error && <DidacticAlert error={error} />}
        </div>
        <DialogFooter>
          <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Salvando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelImportProcessDialog({
  open,
  onClose,
  onConfirm,
  isPending,
  processNumber,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
  processNumber: string;
}) {
  const [reason, setReason] = React.useState('');

  React.useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const canSubmit = reason.trim().length >= 3;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar processo {processNumber}</DialogTitle>
          <DialogDescription>Esta ação não pode ser desfeita. Informe o motivo do cancelamento.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cancel_reason">Motivo *</Label>
          <Input id="cancel_reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Mínimo 3 caracteres" />
        </div>
        <DialogFooter>
          <Button type="button" variant="destructive" disabled={!canSubmit || isPending} onClick={() => onConfirm(reason.trim())}>
            {isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatDate(value: string | null): string {
  if (!value) return 'Não registrado';
  return new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatMoney(value: string | number | null): string {
  if (value == null) return '-';
  return Number(value).toFixed(2);
}
