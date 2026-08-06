import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Eye, FileText, RefreshCw, Ban, ShoppingCart } from 'lucide-react';

import * as salesApi from '@/api/sales';
import * as fiscalApi from '@/api/fiscal';
import * as clientsApi from '@/api/clients';
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

const STATUS_VARIANT: Record<salesApi.SaleStatus, 'default' | 'success' | 'destructive' | 'secondary' | 'warning'> = {
  quote: 'secondary',
  confirmed: 'default',
  partially_invoiced: 'warning',
  invoiced: 'success',
  shipped: 'success',
  canceled: 'destructive',
};

const STATUS_LABEL: Record<salesApi.SaleStatus, string> = {
  quote: 'Orçamento',
  confirmed: 'Confirmada',
  partially_invoiced: 'Faturada parcialmente',
  invoiced: 'Faturada',
  shipped: 'Embarcada',
  canceled: 'Cancelada',
};

const NFE_STATUS_LABEL: Record<string, string> = {
  pending: 'Não emitida',
  processing: 'Processando',
  authorized: 'Autorizada',
  denied: 'Negada',
  cancelled: 'Cancelada',
};

const NFE_STATUS_VARIANT: Record<string, 'default' | 'success' | 'destructive' | 'secondary' | 'warning'> = {
  pending: 'secondary',
  processing: 'warning',
  authorized: 'success',
  denied: 'destructive',
  cancelled: 'secondary',
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Dinheiro',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  pix: 'Pix',
  boleto: 'Boleto',
  check: 'Cheque',
};

const saleItemSchema = z.object({
  product_id: z.coerce.number().int().positive('Selecione um produto.'),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero.'),
  unit_price: z.coerce.number().positive('Preço deve ser maior que zero.'),
});

const saleSchema = z.object({
  customer_id: z.coerce.number().int().positive('Selecione um cliente.'),
  items: z.array(saleItemSchema).min(1, 'Adicione ao menos um item.'),
});

type SaleFormData = z.infer<typeof saleSchema>;

/** `FE2`: PDV/pedidos — criar venda, listar, cancelar. */
export default function SalesPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [detailsSale, setDetailsSale] = React.useState<salesApi.Sale | null>(null);
  const [page, setPage] = React.useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sales', page],
    queryFn: () => salesApi.listSales({ limit: 20, page }),
  });

  const { data: clients } = useQuery({ queryKey: ['clients-all'], queryFn: () => clientsApi.listClients({ limit: 200 }) });
  const { data: products } = useQuery({ queryKey: ['products-all'], queryFn: () => productsApi.listProducts({ limit: 200 }) });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: { items: [{ product_id: undefined, quantity: 1, unit_price: undefined }] as never },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const createMutation = useMutation({
    mutationFn: salesApi.createSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setOpen(false);
      reset({ customer_id: undefined, items: [{ product_id: undefined, quantity: 1, unit_price: undefined }] } as never);
      setFormError(null);
    },
    onError: (error) => setFormError(extractApiErrorMessage(error)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: salesApi.SaleStatus }) => salesApi.updateSaleStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales'] }),
    onError: (error) => window.alert(extractApiErrorMessage(error, 'Não foi possível alterar o status da venda.')),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <ShoppingCart className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Vendas</h1>
            <p className="text-sm text-muted-foreground">Pedidos, orçamentos e emissão de nota fiscal.</p>
          </div>
        </div>
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus /> Nova venda
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nova venda</DialogTitle>
              </DialogHeader>
              <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => createMutation.mutate(values))} noValidate>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="customer_id">Cliente</Label>
                  <SelectNative id="customer_id" {...register('customer_id')} defaultValue="">
                    <option value="" disabled>
                      Selecione...
                    </option>
                    {clients?.data.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </SelectNative>
                  {errors.customer_id && <p className="text-sm text-destructive">{errors.customer_id.message}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Itens</Label>
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2">
                      <div className="flex-1">
                        <SelectNative {...register(`items.${index}.product_id`)} defaultValue="">
                          <option value="" disabled>
                            Produto...
                          </option>
                          {products?.data.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.code} — {product.name}
                            </option>
                          ))}
                        </SelectNative>
                      </div>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Qtd."
                        className="w-24"
                        {...register(`items.${index}.quantity`)}
                      />
                      <Input
                        type="number"
                        step="any"
                        placeholder="Preço unit."
                        className="w-28"
                        {...register(`items.${index}.unit_price`)}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                  {errors.items?.message && <p className="text-sm text-destructive">{errors.items.message}</p>}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ product_id: undefined, quantity: 1, unit_price: undefined } as never)}
                  >
                    <Plus className="size-3" /> Adicionar item
                  </Button>
                </div>

                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                    {isSubmitting ? 'Salvando...' : 'Criar venda'}
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
            <TableHead>#</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-destructive">
                Não foi possível carregar as vendas. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((sale) => (
            <TableRow
              key={sale.id}
              className="cursor-pointer border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5"
              onClick={() => setDetailsSale(sale)}
            >
              <TableCell className="font-medium">{sale.id}</TableCell>
              <TableCell>{sale.customer?.name ?? sale.customer_id}</TableCell>
              <TableCell className="text-right tabular-nums">R$ {Number(sale.total_amount).toFixed(2)}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[sale.status]}>{STATUS_LABEL[sale.status]}</Badge>
              </TableCell>
              <TableCell>{new Date(sale.createdAt).toLocaleDateString('pt-BR')}</TableCell>
              {canWrite && (
                <TableCell className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                  <Button size="sm" variant="ghost" onClick={() => setDetailsSale(sale)}>
                    <Eye className="size-4" /> Detalhes
                  </Button>
                  {sale.status === 'confirmed' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (window.confirm(`Cancelar a venda #${sale.id}? O estoque será restaurado.`)) {
                          statusMutation.mutate({ id: sale.id, status: 'canceled' });
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
                Nenhuma venda registrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <SaleDetailSheet sale={detailsSale} onClose={() => setDetailsSale(null)} />
    </div>
  );
}

function SaleDetailSheet({ sale, onClose }: { sale: salesApi.Sale | null; onClose: () => void }) {
  const { hasRole, permissions } = useAuth();
  // UC-41/§11: emissão e cancelamento de NF-e exigem nível "gestor", resolvido
  // como authorizeModule('vendas', 'approve') no backend (Bloco 5). Consulta de
  // status (GET) permanece liberada para qualquer nível do módulo vendas.
  const canApproveNfe = hasRole('admin') || permissions?.vendas === 'approve';
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();
  const [nfeOverride, setNfeOverride] = React.useState<salesApi.Sale | null>(null);
  const [nfeError, setNfeError] = React.useState<DidacticError | null>(null);
  const [nfeDialogOpen, setNfeDialogOpen] = React.useState(false);
  const [editItemsOpen, setEditItemsOpen] = React.useState(false);

  React.useEffect(() => {
    setNfeOverride(null);
    setNfeError(null);
    setNfeDialogOpen(false);
    setEditItemsOpen(false);
  }, [sale?.id]);

  const current = nfeOverride ?? sale;
  const items = current?.items ?? [];
  const itemsTotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);
  // Gap 3/3 (faturamento parcial): saldo pendente de cada item = quantity - invoiced_quantity.
  const hasPendingBalance = items.some((item) => Number(item.quantity) - Number(item.invoiced_quantity ?? 0) > 1e-9);
  // Gap 2/3 (alteração de pedido): só permitido antes do faturamento (quote/confirmed).
  const canEditItems = current?.status === 'quote' || current?.status === 'confirmed';

  const invalidateSales = () => queryClient.invalidateQueries({ queryKey: ['sales'] });

  const issueMutation = useMutation({
    mutationFn: (items?: fiscalApi.IssueSaleNfeItemInput[]) => fiscalApi.issueSaleNfe(current!.id, items),
    onSuccess: (updated) => {
      setNfeOverride(updated);
      setNfeError(null);
      setNfeDialogOpen(false);
      invalidateSales();
    },
    onError: (error) =>
      setNfeError(
        translateApiError(
          error,
          'Não foi possível emitir a NF-e',
          'ship-sale',
          'Apenas usuários com nível gestor no módulo Vendas podem emitir NF-e.',
        ),
      ),
  });

  const editItemsMutation = useMutation({
    mutationFn: (items: Array<salesApi.SaleItemInput & { sale_item_id?: number }>) => salesApi.editSaleItems(current!.id, items),
    onSuccess: (updated) => {
      setNfeOverride(updated);
      setEditItemsOpen(false);
      invalidateSales();
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const checkStatusMutation = useMutation({
    mutationFn: () => fiscalApi.getSaleNfeStatus(current!.id),
    onSuccess: (updated) => {
      setNfeOverride(updated);
      setNfeError(null);
      invalidateSales();
    },
    onError: (error) => setNfeError(translateApiError(error, 'Não foi possível consultar o status da NF-e', 'ship-sale')),
  });

  const cancelNfeMutation = useMutation({
    mutationFn: (reason: string) => fiscalApi.cancelSaleNfe(current!.id, reason),
    onSuccess: (updated) => {
      setNfeOverride(updated);
      setNfeError(null);
      invalidateSales();
    },
    onError: (error) =>
      setNfeError(
        translateApiError(
          error,
          'Não foi possível cancelar a NF-e',
          'ship-sale',
          'Apenas usuários com nível gestor no módulo Vendas podem cancelar NF-e.',
        ),
      ),
  });

  const nfeStatus = current?.nfe_status ?? 'pending';
  const nfeBusy = issueMutation.isPending || checkStatusMutation.isPending || cancelNfeMutation.isPending;

  return (
    <Sheet open={Boolean(sale)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        {current && (
          <>
            <SheetHeader>
              <SheetTitle>Venda #{current.id}</SheetTitle>
              <SheetDescription>Detalhes completos da operação de venda.</SheetDescription>
            </SheetHeader>

            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Cliente" value={current.customer?.name ?? `#${current.customer_id}`} />
              <DetailField label="Status" value={<Badge variant={STATUS_VARIANT[current.status]}>{STATUS_LABEL[current.status]}</Badge>} />
              <DetailField label="Data" value={new Date(current.createdAt).toLocaleDateString('pt-BR')} />
              <DetailField label="Forma de pagamento" value={PAYMENT_LABEL[current.payment_method ?? ''] ?? 'Não informada'} />
              {current.installments > 1 && <DetailField label="Parcelas" value={`${current.installments}x`} />}
              {Number(current.discount) > 0 && <DetailField label="Desconto" value={`R$ ${Number(current.discount).toFixed(2)}`} />}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Itens da venda</p>
                {canWrite && canEditItems && (
                  <Button size="sm" variant="outline" onClick={() => setEditItemsOpen(true)}>
                    Editar itens
                  </Button>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="text-right">Preço unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Faturado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product ? `${item.product.code} — ${item.product.name}` : item.product_id}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(item.quantity)}</TableCell>
                      <TableCell className="text-right tabular-nums">R$ {Number(item.unit_price).toFixed(2)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        R$ {Number(item.total_price ?? Number(item.quantity) * Number(item.unit_price)).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                        {Number(item.invoiced_quantity ?? 0)} de {Number(item.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Itens não disponíveis.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-1 rounded-lg border bg-brand/5 p-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Soma dos itens</span>
                <span className="tabular-nums">R$ {itemsTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-brand">
                <span>Total da venda</span>
                <span className="tabular-nums">R$ {Number(current.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Nota fiscal (NF-e)</p>
                <Badge variant={NFE_STATUS_VARIANT[nfeStatus] ?? 'secondary'}>{NFE_STATUS_LABEL[nfeStatus] ?? nfeStatus}</Badge>
              </div>

              {current.nfe_number && (
                <p className="text-xs text-muted-foreground">
                  Número {current.nfe_number}
                  {current.nfe_issued_at && ` — emitida em ${new Date(current.nfe_issued_at).toLocaleDateString('pt-BR')}`}
                </p>
              )}
              {current.nfe_error_message && <p className="text-sm text-destructive">{current.nfe_error_message}</p>}
              {nfeError && <DidacticAlert error={nfeError} />}

              {(current.nfe_danfe_url || current.nfe_xml_url) && (
                <div className="flex gap-3 text-sm">
                  {current.nfe_danfe_url && (
                    <a href={current.nfe_danfe_url} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                      Ver DANFE
                    </a>
                  )}
                  {current.nfe_xml_url && (
                    <a href={current.nfe_xml_url} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                      Baixar XML
                    </a>
                  )}
                </div>
              )}

              {hasRole('admin', 'operator') && (
                <div className="flex flex-wrap gap-2">
                  {/* UC-41/§11: emissão e cancelamento de NF-e exigem nível gestor
                      (authorizeModule('vendas', 'approve')) — botões ocultos para
                      quem não tem esse nível, evitando um 403 didaticamente inútil. */}
                  {(current.status === 'confirmed' || current.status === 'partially_invoiced') &&
                    nfeStatus !== 'processing' &&
                    hasPendingBalance &&
                    canApproveNfe && (
                      <Button size="sm" disabled={nfeBusy} onClick={() => setNfeDialogOpen(true)}>
                        <FileText className="size-4" />{' '}
                        {current.status === 'partially_invoiced' ? 'Faturar saldo restante' : 'Emitir NF-e'}
                      </Button>
                    )}
                  {nfeStatus === 'processing' && (
                    <Button size="sm" variant="outline" disabled={nfeBusy} onClick={() => checkStatusMutation.mutate()}>
                      <RefreshCw className="size-4" /> {checkStatusMutation.isPending ? 'Consultando...' : 'Consultar status'}
                    </Button>
                  )}
                  {nfeStatus === 'authorized' && canApproveNfe && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={nfeBusy}
                      onClick={() => {
                        const reason = window.prompt('Motivo do cancelamento da NF-e:');
                        if (reason) cancelNfeMutation.mutate(reason);
                      }}
                    >
                      <Ban className="size-4" /> {cancelNfeMutation.isPending ? 'Cancelando...' : 'Cancelar NF-e'}
                    </Button>
                  )}
                  {(current.status === 'confirmed' || current.status === 'partially_invoiced') &&
                    nfeStatus !== 'processing' &&
                    hasPendingBalance &&
                    !canApproveNfe && (
                      <p className="text-xs text-muted-foreground">
                        Emissão de NF-e restrita ao nível gestor do módulo Vendas.
                      </p>
                    )}
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>

      <IssueNfeDialog
        open={nfeDialogOpen}
        onOpenChange={setNfeDialogOpen}
        items={items}
        busy={issueMutation.isPending}
        error={nfeError}
        onSubmit={(selectedItems) => issueMutation.mutate(selectedItems)}
      />

      <EditSaleItemsDialog
        open={editItemsOpen}
        onOpenChange={setEditItemsOpen}
        sale={current}
        onSubmit={(items) => editItemsMutation.mutate(items)}
        busy={editItemsMutation.isPending}
        error={editItemsMutation.error}
      />
    </Sheet>
  );
}

/**
 * Dialog de emissão de NF-e com seleção de quantidade por item (gap 3/3,
 * "Faturamento parcial"). Cada linha nasce preenchida com o saldo pendente
 * inteiro (comportamento padrão preservado se o usuário não alterar nada);
 * o vendedor pode reduzir a quantidade de qualquer linha para faturar
 * apenas parte do pedido.
 */
function IssueNfeDialog({
  open,
  onOpenChange,
  items,
  busy,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: salesApi.SaleItem[];
  busy: boolean;
  error: DidacticError | null;
  onSubmit: (items: fiscalApi.IssueSaleNfeItemInput[]) => void;
}) {
  const pendingItems = items.filter((item) => Number(item.quantity) - Number(item.invoiced_quantity ?? 0) > 1e-9);
  const [quantities, setQuantities] = React.useState<Record<number, number>>({});

  React.useEffect(() => {
    if (!open) return;
    setQuantities(
      Object.fromEntries(pendingItems.map((item) => [item.id, Number(item.quantity) - Number(item.invoiced_quantity ?? 0)])),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Emitir NF-e</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Ajuste a quantidade de cada item para faturar apenas parte do saldo pendente (faturamento parcial), ou mantenha os
            valores sugeridos para faturar tudo o que ainda resta.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Saldo pendente</TableHead>
                <TableHead className="text-right">Faturar agora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingItems.map((item) => {
                const remaining = Number(item.quantity) - Number(item.invoiced_quantity ?? 0);
                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.product ? `${item.product.code} — ${item.product.name}` : item.product_id}</TableCell>
                    <TableCell className="text-right tabular-nums">{remaining}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="any"
                        min={0}
                        max={remaining}
                        className="w-24 ml-auto text-right"
                        value={quantities[item.id] ?? remaining}
                        onChange={(event) =>
                          setQuantities((prev) => ({ ...prev, [item.id]: Number(event.target.value) }))
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {error && <DidacticAlert error={error} />}
        </div>
        <DialogFooter>
          <Button
            disabled={busy}
            onClick={() => {
              const selected = pendingItems
                .map((item) => ({ sale_item_id: item.id, quantity: Number(quantities[item.id] ?? 0) }))
                .filter((entry) => entry.quantity > 0);
              onSubmit(selected);
            }}
          >
            {busy ? 'Emitindo...' : 'Confirmar emissão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Dialog de "Alteração de pedido" (gap 2/3): edita produto/quantidade/preço
 * dos itens de uma venda `quote`/`confirmed` via `PUT /api/sales/:id/items`
 * (substituição completa do conjunto de itens).
 */
function EditSaleItemsDialog({
  open,
  onOpenChange,
  sale,
  onSubmit,
  busy,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: salesApi.Sale | null;
  onSubmit: (items: Array<salesApi.SaleItemInput & { sale_item_id?: number }>) => void;
  busy: boolean;
  error: unknown;
}) {
  const { data: products } = useQuery({ queryKey: ['products-all'], queryFn: () => productsApi.listProducts({ limit: 200 }) });
  type Row = { sale_item_id?: number; product_id: number; quantity: number; unit_price: number; key: string };
  const [rows, setRows] = React.useState<Row[]>([]);

  React.useEffect(() => {
    if (!open || !sale) return;
    setRows(
      (sale.items ?? []).map((item) => ({
        sale_item_id: item.id,
        product_id: item.product_id,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        key: `existing-${item.id}`,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sale?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar itens da venda #{sale?.id}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <div key={row.key} className="flex items-end gap-2">
              <div className="flex-1">
                <SelectNative
                  value={row.product_id}
                  onChange={(event) =>
                    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, product_id: Number(event.target.value) } : r)))
                  }
                >
                  <option value="" disabled>
                    Produto...
                  </option>
                  {products?.data.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.code} — {product.name}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <Input
                type="number"
                step="any"
                placeholder="Qtd."
                className="w-24"
                value={row.quantity}
                onChange={(event) =>
                  setRows((prev) => prev.map((r, i) => (i === index ? { ...r, quantity: Number(event.target.value) } : r)))
                }
              />
              <Input
                type="number"
                step="any"
                placeholder="Preço unit."
                className="w-28"
                value={row.unit_price}
                onChange={(event) =>
                  setRows((prev) => prev.map((r, i) => (i === index ? { ...r, unit_price: Number(event.target.value) } : r)))
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                disabled={rows.length === 1}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setRows((prev) => [
                ...prev,
                { product_id: undefined as unknown as number, quantity: 1, unit_price: undefined as unknown as number, key: `new-${Date.now()}-${prev.length}` },
              ])
            }
          >
            <Plus className="size-3" /> Adicionar item
          </Button>
          {error ? <p className="text-sm text-destructive">{extractApiErrorMessage(error)}</p> : null}
        </div>
        <DialogFooter>
          <Button
            disabled={busy}
            onClick={() =>
              onSubmit(
                rows.map(({ key, ...row }) => row),
              )
            }
          >
            {busy ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
