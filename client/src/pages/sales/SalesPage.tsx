import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Eye, FileText, RefreshCw, Ban } from 'lucide-react';

import * as salesApi from '@/api/sales';
import * as fiscalApi from '@/api/fiscal';
import * as clientsApi from '@/api/clients';
import * as productsApi from '@/api/products';
import { extractApiErrorMessage } from '@/api/httpClient';
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

const STATUS_VARIANT: Record<salesApi.SaleStatus, 'default' | 'success' | 'destructive' | 'secondary'> = {
  quote: 'secondary',
  confirmed: 'default',
  invoiced: 'success',
  shipped: 'success',
  canceled: 'destructive',
};

const STATUS_LABEL: Record<salesApi.SaleStatus, string> = {
  quote: 'Orçamento',
  confirmed: 'Confirmada',
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Vendas</h1>
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
            <TableHead>Total</TableHead>
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
            <TableRow key={sale.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setDetailsSale(sale)}>
              <TableCell className="font-medium">{sale.id}</TableCell>
              <TableCell>{sale.customer?.name ?? sale.customer_id}</TableCell>
              <TableCell>R$ {Number(sale.total_amount).toFixed(2)}</TableCell>
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
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [nfeOverride, setNfeOverride] = React.useState<salesApi.Sale | null>(null);
  const [nfeError, setNfeError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setNfeOverride(null);
    setNfeError(null);
  }, [sale?.id]);

  const current = nfeOverride ?? sale;
  const items = current?.items ?? [];
  const itemsTotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);

  const invalidateSales = () => queryClient.invalidateQueries({ queryKey: ['sales'] });

  const issueMutation = useMutation({
    mutationFn: () => fiscalApi.issueSaleNfe(current!.id),
    onSuccess: (updated) => {
      setNfeOverride(updated);
      setNfeError(null);
      invalidateSales();
    },
    onError: (error) => setNfeError(extractApiErrorMessage(error, 'Não foi possível emitir a NF-e.')),
  });

  const checkStatusMutation = useMutation({
    mutationFn: () => fiscalApi.getSaleNfeStatus(current!.id),
    onSuccess: (updated) => {
      setNfeOverride(updated);
      setNfeError(null);
      invalidateSales();
    },
    onError: (error) => setNfeError(extractApiErrorMessage(error, 'Não foi possível consultar o status da NF-e.')),
  });

  const cancelNfeMutation = useMutation({
    mutationFn: (reason: string) => fiscalApi.cancelSaleNfe(current!.id, reason),
    onSuccess: (updated) => {
      setNfeOverride(updated);
      setNfeError(null);
      invalidateSales();
    },
    onError: (error) => setNfeError(extractApiErrorMessage(error, 'Não foi possível cancelar a NF-e.')),
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
              <p className="text-sm font-semibold">Itens da venda</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Qtd.</TableHead>
                    <TableHead>Preço unit.</TableHead>
                    <TableHead>Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product ? `${item.product.code} — ${item.product.name}` : item.product_id}</TableCell>
                      <TableCell>{Number(item.quantity)}</TableCell>
                      <TableCell>R$ {Number(item.unit_price).toFixed(2)}</TableCell>
                      <TableCell>R$ {Number(item.total_price ?? Number(item.quantity) * Number(item.unit_price)).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
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
                <span>Total da venda</span>
                <span>R$ {Number(current.total_amount).toFixed(2)}</span>
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
              {nfeError && <p className="text-sm text-destructive">{nfeError}</p>}

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
                  {current.status === 'confirmed' && (nfeStatus === 'pending' || nfeStatus === 'denied') && (
                    <Button size="sm" disabled={nfeBusy} onClick={() => issueMutation.mutate()}>
                      <FileText className="size-4" /> {issueMutation.isPending ? 'Emitindo...' : 'Emitir NF-e'}
                    </Button>
                  )}
                  {nfeStatus === 'processing' && (
                    <Button size="sm" variant="outline" disabled={nfeBusy} onClick={() => checkStatusMutation.mutate()}>
                      <RefreshCw className="size-4" /> {checkStatusMutation.isPending ? 'Consultando...' : 'Consultar status'}
                    </Button>
                  )}
                  {nfeStatus === 'authorized' && hasRole('admin') && (
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
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
