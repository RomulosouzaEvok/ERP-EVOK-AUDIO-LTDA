import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router';
import { Plus, Trash2, ShoppingCart, ClipboardList } from 'lucide-react';

import * as mrpApi from '@/api/mrp';
import { extractApiErrorMessage } from '@/api/httpClient';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ItemSearchSelect } from '@/components/ItemSearchSelect';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { DidacticAlert } from '@/components/DidacticAlert';

const ORIGIN_LABEL: Record<mrpApi.MrpDemandOrigin, string> = {
  MANUAL: 'Manual',
  PEDIDO_VENDA: 'Pedido de venda',
  PREVISAO: 'Previsão',
  ORDEM_PRODUCAO: 'Ordem de produção',
};

/** Cores por status de ordem planejada do MRP. */
const PLANNED_ORDER_STATUS_STYLE: Record<string, string> = {
  RASCUNHO: 'border-transparent bg-muted text-muted-foreground',
  APROVADA: 'border-transparent bg-blue-600 text-white',
  EM_EXECUCAO: 'border-transparent bg-amber-500 text-white',
  CONCLUIDA: 'border-transparent bg-emerald-600 text-white',
  CANCELADA: 'border-transparent bg-destructive text-destructive-foreground',
};

/** Badge de status da ordem planejada, com fallback neutro para status desconhecidos. */
function PlannedOrderStatusBadge({ status }: { status: string }) {
  const className = PLANNED_ORDER_STATUS_STYLE[status];
  return <Badge className={className} variant={className ? undefined : 'secondary'}>{status}</Badge>;
}

/** Ordens planejadas podem virar requisição apenas quando ainda não avançaram no fluxo de compra. */
function isConvertible(status: string): boolean {
  return (mrpApi.CONVERTIBLE_PLANNED_ORDER_STATUSES as readonly string[]).includes(status);
}

const demandSchema = z.object({
  item_id: z.string().min(1, 'Selecione um item.'),
  quantidade: z.coerce.number().positive('Quantidade deve ser maior que zero.'),
  data_necessidade: z.string().min(1, 'Informe a data de necessidade.'),
  origem: z.enum(['MANUAL', 'PEDIDO_VENDA', 'PREVISAO', 'ORDEM_PRODUCAO']),
});

const planSchema = z.object({
  demands: z.array(demandSchema).min(1, 'Adicione ao menos uma demanda.'),
});

type PlanFormData = z.infer<typeof planSchema>;

/** MRP: planejamento de necessidades de materiais contra o estoque real (não congelado). */
export default function MrpPage() {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [convertDialogOpen, setConvertDialogOpen] = React.useState(false);
  const [convertNotes, setConvertNotes] = React.useState('');
  const [convertError, setConvertError] = React.useState<DidacticError | null>(null);
  const [convertedRequisition, setConvertedRequisition] = React.useState<mrpApi.ConvertPlannedOrdersResult | null>(
    null,
  );

  const { data: plannedOrders, isLoading, isError } = useQuery({
    queryKey: ['mrp-planned-orders'],
    queryFn: () => mrpApi.listPlannedOrders(),
  });

  const convertibleOrders = React.useMemo(
    () => (plannedOrders ?? []).filter((order) => isConvertible(order.status)),
    [plannedOrders],
  );
  const convertibleIds = React.useMemo(() => convertibleOrders.map((order) => String(order.id)), [convertibleOrders]);
  const allConvertibleSelected = convertibleIds.length > 0 && convertibleIds.every((id) => selectedIds.includes(id));

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  }

  function toggleSelectAll() {
    setSelectedIds(allConvertibleSelected ? [] : convertibleIds);
  }

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: { demands: [{ item_id: '', quantidade: 1, data_necessidade: '', origem: 'MANUAL' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'demands' });

  const planMutation = useMutation({
    mutationFn: (values: PlanFormData) => mrpApi.planMrp({ demands: values.demands }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mrp-planned-orders'] });
      reset({ demands: [{ item_id: '', quantidade: 1, data_necessidade: '', origem: 'MANUAL' }] });
      setFormError(null);
    },
    onError: (error) => setFormError(extractApiErrorMessage(error)),
  });

  const convertMutation = useMutation({
    mutationFn: () =>
      mrpApi.convertPlannedOrders({
        planned_order_ids: selectedIds,
        notes: convertNotes.trim() || undefined,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['mrp-planned-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });
      setSelectedIds([]);
      setConvertNotes('');
      setConvertError(null);
      setConvertDialogOpen(false);
      setConvertedRequisition(result);
    },
    onError: (error) =>
      setConvertError(
        translateApiError(error, 'Não é possível converter as ordens planejadas selecionadas', 'convert-mrp-order'),
      ),
  });

  function closeConvertDialog() {
    setConvertDialogOpen(false);
    setConvertError(null);
    setConvertNotes('');
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <ClipboardList className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">MRP — Planejamento de necessidades</h1>
          <p className="text-sm text-muted-foreground">
            Cálculo de necessidades de materiais contra o estoque real, com conversão direta em requisição de compra.
          </p>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Gerar plano</h2>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => planMutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="mb-1.5 block text-xs">Item</Label>
                  <Controller
                    control={control}
                    name={`demands.${index}.item_id`}
                    render={({ field: controllerField }) => (
                      <ItemSearchSelect
                        value={null}
                        onChange={(item) => controllerField.onChange(item?.id ?? '')}
                        placeholder="Item..."
                      />
                    )}
                  />
                </div>
                <div className="w-28">
                  <Label className="mb-1.5 block text-xs">Quantidade</Label>
                  <Controller
                    control={control}
                    name={`demands.${index}.quantidade`}
                    render={({ field: controllerField }) => (
                      <Input type="number" step="any" {...controllerField} value={controllerField.value ?? ''} />
                    )}
                  />
                </div>
                <div className="w-40">
                  <Label className="mb-1.5 block text-xs">Data necessidade</Label>
                  <Controller
                    control={control}
                    name={`demands.${index}.data_necessidade`}
                    render={({ field: controllerField }) => <Input type="date" {...controllerField} />}
                  />
                </div>
                <div className="w-44">
                  <Label className="mb-1.5 block text-xs">Origem</Label>
                  <Controller
                    control={control}
                    name={`demands.${index}.origem`}
                    render={({ field: controllerField }) => (
                      <SelectNative {...controllerField}>
                        {Object.entries(ORIGIN_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </SelectNative>
                    )}
                  />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            {errors.demands?.message && <p className="text-sm text-destructive">{errors.demands.message}</p>}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => append({ item_id: '', quantidade: 1, data_necessidade: '', origem: 'MANUAL' })}
            >
              <Plus className="size-3" /> Adicionar demanda
            </Button>
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button type="submit" className="w-fit" disabled={isSubmitting || planMutation.isPending}>
            {planMutation.isPending ? 'Gerando...' : 'Gerar plano'}
          </Button>
        </form>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Ordens planejadas</h2>
          <Button
            type="button"
            size="sm"
            disabled={selectedIds.length === 0}
            onClick={() => {
              setConvertError(null);
              setConvertDialogOpen(true);
            }}
          >
            <ShoppingCart className="size-4" /> Converter em Requisição ({selectedIds.length})
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  aria-label="Selecionar todas as ordens convertíveis"
                  checked={allConvertibleSelected}
                  disabled={convertibleIds.length === 0}
                  onChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Bruta</TableHead>
              <TableHead className="text-right">Disponível</TableHead>
              <TableHead className="text-right">Líquida</TableHead>
              <TableHead className="text-right">Planejada</TableHead>
              <TableHead>Necessidade</TableHead>
              <TableHead>Liberação</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows columns={9} />}
            {isError && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-destructive">
                  Não foi possível carregar as ordens planejadas. Tente novamente.
                </TableCell>
              </TableRow>
            )}
            {plannedOrders?.map((order) => {
              const id = String(order.id);
              const convertible = isConvertible(order.status);
              return (
                <TableRow key={order.id} className="hover:bg-accent/50">
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Selecionar ordem planejada ${id}`}
                      checked={selectedIds.includes(id)}
                      disabled={!convertible}
                      onChange={() => toggleSelected(id)}
                    />
                  </TableCell>
                  <TableCell>{order.item ? `${order.item.codigo} — ${order.item.descricao}` : '-'}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(order.necessidade_bruta)}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(order.estoque_disponivel)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{Number(order.necessidade_liquida)}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(order.quantidade_planejada)}</TableCell>
                  <TableCell>{new Date(order.data_necessidade).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{new Date(order.data_liberacao).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <PlannedOrderStatusBadge status={order.status} />
                  </TableCell>
                </TableRow>
              );
            })}
            {!isLoading && !isError && (plannedOrders?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Nenhuma ordem planejada gerada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={convertDialogOpen}
        onOpenChange={(nextOpen) => {
          setConvertDialogOpen(nextOpen);
          if (!nextOpen) closeConvertDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Converter em requisição de compra</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {selectedIds.length} ordem(ns) planejada(s) selecionada(s) será(ão) convertida(s) em uma nova Requisição
            de Compra.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="convert-notes">Observações (opcional)</Label>
            <Input
              id="convert-notes"
              value={convertNotes}
              onChange={(event) => setConvertNotes(event.target.value)}
              placeholder="Ex.: Conversão via MRP, reposição urgente..."
            />
          </div>
          {convertError && <DidacticAlert error={convertError} />}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeConvertDialog} disabled={convertMutation.isPending}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={convertMutation.isPending || selectedIds.length === 0}
              onClick={() => convertMutation.mutate()}
            >
              {convertMutation.isPending ? 'Convertendo...' : 'Confirmar conversão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(convertedRequisition)} onOpenChange={(open) => !open && setConvertedRequisition(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Requisição criada com sucesso</DialogTitle>
          </DialogHeader>
          {convertedRequisition && (
            <p className="text-sm">
              A requisição{' '}
              <span className="font-semibold">
                {convertedRequisition.requisition.requisition_number ?? convertedRequisition.requisition.id}
              </span>{' '}
              foi criada a partir de {convertedRequisition.converted_ids.length} ordem(ns) planejada(s).
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConvertedRequisition(null)}>
              Fechar
            </Button>
            <Button type="button" asChild>
              <Link to="/purchases/requisitions" onClick={() => setConvertedRequisition(null)}>
                Ver requisição
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
