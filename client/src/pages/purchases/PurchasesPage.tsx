import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';

import * as purchasesApi from '@/api/purchases';
import * as suppliersApi from '@/api/suppliers';
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

/** `FE3`: pedidos de compra — criar, avançar status, receber itens. */
export default function PurchasesPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [receivingPurchase, setReceivingPurchase] = React.useState<purchasesApi.Purchase | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['purchases'], queryFn: () => purchasesApi.listPurchases({ limit: 50 }) });
  const { data: suppliers } = useQuery({ queryKey: ['suppliers-all'], queryFn: () => suppliersApi.listSuppliers({ limit: 200 }) });
  const { data: products } = useQuery({ queryKey: ['products-all'], queryFn: () => productsApi.listProducts({ limit: 200 }) });

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
                  <Button type="submit" disabled={isSubmitting}>
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
            <TableHead>Pedido</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5}>Carregando...</TableCell>
            </TableRow>
          )}
          {data?.data.map((purchase) => {
            const next = NEXT_STATUS[purchase.status];
            return (
              <TableRow key={purchase.id}>
                <TableCell>{purchase.order_number ?? purchase.id}</TableCell>
                <TableCell>{purchase.supplier?.company_name ?? purchase.supplier_id}</TableCell>
                <TableCell>R$ {Number(purchase.total_amount).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{STATUS_LABEL[purchase.status]}</Badge>
                </TableCell>
                {canWrite && (
                  <TableCell className="flex gap-2">
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
          {!isLoading && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Nenhum pedido registrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <ReceiveItemsDialog purchase={receivingPurchase} onClose={() => setReceivingPurchase(null)} />
    </div>
  );
}

function ReceiveItemsDialog({ purchase, onClose }: { purchase: purchasesApi.Purchase | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [quantities, setQuantities] = React.useState<Record<number, string>>({});
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (purchase) setQuantities({});
  }, [purchase]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!purchase) return;
      const items = Object.entries(quantities)
        .filter(([, value]) => Number(value) > 0)
        .map(([itemId, value]) => ({ item_id: Number(itemId), quantity: Number(value) }));
      if (items.length === 0) throw new Error('Informe a quantidade recebida de ao menos um item.');
      await purchasesApi.receivePurchaseItems(purchase.id, items);
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
