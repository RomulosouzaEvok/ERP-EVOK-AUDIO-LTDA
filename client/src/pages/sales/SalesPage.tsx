import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';

import * as salesApi from '@/api/sales';
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

const STATUS_VARIANT: Record<salesApi.SaleStatus, 'default' | 'success' | 'destructive' | 'secondary'> = {
  quote: 'secondary',
  confirmed: 'default',
  invoiced: 'success',
  canceled: 'destructive',
};

const STATUS_LABEL: Record<salesApi.SaleStatus, string> = {
  quote: 'Orçamento',
  confirmed: 'Confirmada',
  invoiced: 'Faturada',
  canceled: 'Cancelada',
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

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sales'],
    queryFn: () => salesApi.listSales({ limit: 50 }),
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
          {isLoading && (
            <TableRow>
              <TableCell colSpan={6}>Carregando...</TableCell>
            </TableRow>
          )}
          {isError && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-destructive">
                Não foi possível carregar as vendas. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((sale) => (
            <TableRow key={sale.id}>
              <TableCell>{sale.id}</TableCell>
              <TableCell>{sale.customer?.name ?? sale.customer_id}</TableCell>
              <TableCell>R$ {Number(sale.total_amount).toFixed(2)}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[sale.status]}>{STATUS_LABEL[sale.status]}</Badge>
              </TableCell>
              <TableCell>{new Date(sale.createdAt).toLocaleDateString('pt-BR')}</TableCell>
              {canWrite && (
                <TableCell>
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
    </div>
  );
}
