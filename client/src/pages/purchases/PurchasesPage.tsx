import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Eye, ClipboardList, PackageOpen, CalendarClock, AlertOctagon } from 'lucide-react';

import * as purchasesApi from '@/api/purchases';
import * as suppliersApi from '@/api/suppliers';
import * as productsApi from '@/api/products';
import { extractApiErrorMessage } from '@/api/httpClient';
import { useAuth } from '@/context/AuthContext';
import { HandoffDot } from '@/components/HandoffDot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { DetailField } from '@/components/DetailField';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';

const STATUS_LABEL: Record<purchasesApi.PurchaseStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  sent: 'Enviado',
  partial: 'Recebido parcial',
  received: 'Recebido',
  canceled: 'Cancelado',
};

const NEXT_STATUS: Partial<Record<purchasesApi.PurchaseStatus, purchasesApi.PurchaseStatus>> = {
  pending: 'approved',
  approved: 'sent',
};

const purchaseItemSchema = z.object({
  product_id: z.coerce.number().int().positive('Selecione um produto.'),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero.'),
  unit_price: z.coerce.number().min(0, 'Informe o preço unitário.'),
});

const purchaseSchema = z.object({
  supplier_id: z.coerce.number().int().positive('Selecione um fornecedor.'),
  items: z.array(purchaseItemSchema).min(1, 'Adicione ao menos um item.'),
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

const OPEN_ORDER_STATUSES: purchasesApi.PurchaseStatus[] = ['pending', 'approved', 'sent', 'partial'];

/** `FE3`: pedidos de compra — criar, avançar status, receber itens. */
export default function PurchasesPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [receivingPurchase, setReceivingPurchase] = React.useState<purchasesApi.Purchase | null>(null);
  const [detailsPurchase, setDetailsPurchase] = React.useState<purchasesApi.Purchase | null>(null);
  const [page, setPage] = React.useState(1);
  const [openOrdersOnly, setOpenOrdersOnly] = React.useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['purchases', page],
    queryFn: () => purchasesApi.listPurchases({ limit: 20, page }),
  });
  const { data: suppliers } = useQuery({ queryKey: ['suppliers-all'], queryFn: () => suppliersApi.listSuppliers({ limit: 200 }) });
  const { data: products } = useQuery({ queryKey: ['products-all'], queryFn: () => productsApi.listProducts({ limit: 200 }) });
  const { data: cockpit, isLoading: cockpitLoading } = useQuery({
    queryKey: ['purchases-cockpit'],
    queryFn: purchasesApi.getPurchaseCockpit,
  });

  const visiblePurchases = React.useMemo(() => {
    if (!data?.data) return [];
    return openOrdersOnly ? data.data.filter((purchase) => OPEN_ORDER_STATUSES.includes(purchase.status)) : data.data;
  }, [data, openOrdersOnly]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: { items: [{ product_id: undefined, quantity: 1, unit_price: undefined }] as never },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['purchases'] });

  const createMutation = useMutation({
    mutationFn: purchasesApi.createPurchase,
    onSuccess: () => {
      invalidate();
      setOpen(false);
      reset({ supplier_id: undefined, items: [{ product_id: undefined, quantity: 1, unit_price: undefined }] } as never);
      setFormError(null);
    },
    onError: (error) => setFormError(extractApiErrorMessage(error)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: purchasesApi.PurchaseStatus }) => purchasesApi.updatePurchaseStatus(id, status),
    onSuccess: invalidate,
    onError: (error) => window.alert(extractApiErrorMessage(error, 'Não foi possível alterar o status do pedido.')),
  });

  return (
    <div className="flex flex-col gap-4">
      <PurchaseCockpitTiles
        cockpit={cockpit}
        isLoading={cockpitLoading}
        openOrdersOnly={openOrdersOnly}
        onToggleOpenOrders={() => setOpenOrdersOnly((prev) => !prev)}
        onNavigateRequisitions={() => navigate('/purchases/requisitions')}
        onNavigateOverdue={() => navigate('/logistics/recebimento')}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Compras</h1>
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus /> Novo pedido
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Novo pedido de compra</DialogTitle>
              </DialogHeader>
              <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => createMutation.mutate(values))} noValidate>
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
                      <Input type="number" step="any" placeholder="Qtd." className="w-24" {...register(`items.${index}.quantity`)} />
                      <Input type="number" step="any" placeholder="Preço unit." className="w-28" {...register(`items.${index}.unit_price`)} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                  {errors.items?.message && <p className="text-sm text-destructive">{errors.items.message}</p>}
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ product_id: undefined, quantity: 1, unit_price: undefined } as never)}>
                    <Plus className="size-3" /> Adicionar item
                  </Button>
                </div>

                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                    {isSubmitting ? 'Salvando...' : 'Criar pedido'}
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
            <TableHead className="w-6" />
            <TableHead>Pedido</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-destructive">
                Não foi possível carregar os pedidos de compra. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {visiblePurchases.map((purchase) => {
            const next = NEXT_STATUS[purchase.status];
            return (
              <TableRow
                key={purchase.id}
                className="cursor-pointer hover:bg-accent/50"
                onClick={() => setDetailsPurchase(purchase)}
              >
                <TableCell>{purchase.handoff_signal && <HandoffDot signal={purchase.handoff_signal} />}</TableCell>
                <TableCell className="font-medium">{purchase.order_number ?? purchase.id}</TableCell>
                <TableCell>{purchase.supplier?.company_name ?? purchase.supplier_id}</TableCell>
                <TableCell>R$ {Number(purchase.total_amount).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{STATUS_LABEL[purchase.status]}</Badge>
                </TableCell>
                {canWrite && (
                  <TableCell className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => setDetailsPurchase(purchase)}>
                      <Eye className="size-4" /> Detalhes
                    </Button>
                    {next && (
                      <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: purchase.id, status: next })}>
                        Avançar para "{STATUS_LABEL[next]}"
                      </Button>
                    )}
                    {(purchase.status === 'sent' || purchase.status === 'partial') && (
                      <Button size="sm" onClick={() => setReceivingPurchase(purchase)}>
                        Receber itens
                      </Button>
                    )}
                    {purchase.status !== 'canceled' && purchase.status !== 'received' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (window.confirm(`Cancelar o pedido ${purchase.order_number ?? purchase.id}?`)) {
                            statusMutation.mutate({ id: purchase.id, status: 'canceled' });
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
          {!isLoading && !isError && visiblePurchases.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {openOrdersOnly ? 'Nenhum pedido em aberto nesta página.' : 'Nenhum pedido registrado.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {!openOrdersOnly && <Pagination pagination={data?.pagination} onPageChange={setPage} />}

      <ReceiveItemsDialog purchase={receivingPurchase} onClose={() => setReceivingPurchase(null)} />
      <PurchaseDetailSheet purchase={detailsPurchase} onClose={() => setDetailsPurchase(null)} />
    </div>
  );
}

function PurchaseDetailSheet({ purchase, onClose }: { purchase: purchasesApi.Purchase | null; onClose: () => void }) {
  const items = purchase?.items ?? [];
  const itemsTotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);

  return (
    <Sheet open={Boolean(purchase)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        {purchase && (
          <>
            <SheetHeader>
              <SheetTitle>Pedido de compra {purchase.order_number ?? `#${purchase.id}`}</SheetTitle>
              <SheetDescription>Detalhes completos da operação de compra.</SheetDescription>
            </SheetHeader>

            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Fornecedor" value={purchase.supplier?.company_name ?? `#${purchase.supplier_id}`} />
              <DetailField label="Status" value={<Badge variant="secondary">{STATUS_LABEL[purchase.status]}</Badge>} />
              <DetailField label="Criado em" value={new Date(purchase.createdAt).toLocaleDateString('pt-BR')} />
              <DetailField
                label="Previsão de entrega"
                value={purchase.expected_date ? new Date(purchase.expected_date).toLocaleDateString('pt-BR') : 'Não informada'}
              />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">Itens do pedido</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Qtd.</TableHead>
                    <TableHead>Recebido</TableHead>
                    <TableHead>Preço unit.</TableHead>
                    <TableHead>Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product ? `${item.product.code} — ${item.product.name}` : item.product_id}</TableCell>
                      <TableCell>{Number(item.quantity)}</TableCell>
                      <TableCell>{Number(item.received_quantity)}</TableCell>
                      <TableCell>R$ {Number(item.unit_price).toFixed(2)}</TableCell>
                      <TableCell>R$ {(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}</TableCell>
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

            <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Soma dos itens</span>
                <span>R$ {itemsTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total do pedido</span>
                <span>R$ {Number(purchase.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ReceiveItemsDialog({ purchase, onClose }: { purchase: purchasesApi.Purchase | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [quantities, setQuantities] = React.useState<Record<number, string>>({});
  const [invoiceNumber, setInvoiceNumber] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (purchase) {
      setQuantities({});
      setInvoiceNumber('');
    }
  }, [purchase]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!purchase) return;
      const items = Object.entries(quantities)
        .filter(([, value]) => Number(value) > 0)
        .map(([itemId, value]) => ({ item_id: Number(itemId), quantity: Number(value) }));
      if (items.length === 0) throw new Error('Informe a quantidade recebida de ao menos um item.');
      if (!invoiceNumber.trim()) throw new Error('Informe o número da nota fiscal.');
      await purchasesApi.receivePurchaseItems(purchase.id, { invoice_number: invoiceNumber.trim(), items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setError(null);
      onClose();
    },
    onError: (err) => setError(extractApiErrorMessage(err)),
  });

  return (
    <Dialog open={Boolean(purchase)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receber itens — {purchase?.order_number ?? purchase?.id}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="receive-invoice-number">Número da NF *</Label>
            <Input
              id="receive-invoice-number"
              value={invoiceNumber}
              onChange={(event) => setInvoiceNumber(event.target.value)}
              placeholder="Ex.: 123456"
            />
          </div>
          {purchase?.items?.map((item) => {
            const pending = Number(item.quantity) - Number(item.received_quantity);
            return (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <div className="text-sm">
                  <p>{item.product?.name ?? item.product_id}</p>
                  <p className="text-xs text-muted-foreground">Pendente: {pending}</p>
                </div>
                <Input
                  type="number"
                  step="any"
                  className="w-28"
                  placeholder="Qtd. recebida"
                  value={quantities[item.id] ?? ''}
                  onChange={(event) => setQuantities((prev) => ({ ...prev, [item.id]: event.target.value }))}
                />
              </div>
            );
          })}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : 'Confirmar recebimento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PurchaseCockpitTiles({
  cockpit,
  isLoading,
  openOrdersOnly,
  onToggleOpenOrders,
  onNavigateRequisitions,
  onNavigateOverdue,
}: {
  cockpit: purchasesApi.PurchaseCockpit | undefined;
  isLoading: boolean;
  openOrdersOnly: boolean;
  onToggleOpenOrders: () => void;
  onNavigateRequisitions: () => void;
  onNavigateOverdue: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card
        className="cursor-pointer transition-colors hover:bg-accent/50"
        onClick={onNavigateRequisitions}
        role="button"
        tabIndex={0}
      >
        <CardContent className="flex items-center gap-3 p-4">
          <ClipboardList className="size-8 text-muted-foreground" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Requisições pendentes</p>
            <p className="text-2xl font-semibold">{isLoading ? '—' : (cockpit?.pending_requisitions ?? 0)}</p>
          </div>
        </CardContent>
      </Card>

      <Card
        className={`cursor-pointer transition-colors hover:bg-accent/50 ${openOrdersOnly ? 'ring-2 ring-primary' : ''}`}
        onClick={onToggleOpenOrders}
        role="button"
        tabIndex={0}
      >
        <CardContent className="flex items-center gap-3 p-4">
          <PackageOpen className="size-8 text-muted-foreground" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pedidos em aberto</p>
            <p className="text-2xl font-semibold">
              {isLoading ? '—' : `${cockpit?.open_orders.count ?? 0} · R$ ${Number(cockpit?.open_orders.total_amount ?? 0).toFixed(2)}`}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <CalendarClock className="size-8 text-emerald-600" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Chegando em 7 dias</p>
            <p className="text-2xl font-semibold text-emerald-700">{isLoading ? '—' : (cockpit?.arriving_this_week ?? 0)}</p>
          </div>
        </CardContent>
      </Card>

      <Card
        className="cursor-pointer transition-colors hover:bg-accent/50"
        onClick={onNavigateOverdue}
        role="button"
        tabIndex={0}
      >
        <CardContent className="flex items-center gap-3 p-4">
          <AlertOctagon className="size-8 text-destructive" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Atrasados</p>
            <p className="text-2xl font-semibold text-destructive">{isLoading ? '—' : (cockpit?.overdue ?? 0)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
