import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Users, Tags, Trash2 } from 'lucide-react';

import * as clientsApi from '@/api/clients';
import * as salesApi from '@/api/sales';
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
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';

const clientSchema = z.object({
  name: z.string().min(1, 'Informe o nome.'),
  cpf_cnpj: z.string().min(1, 'Informe o CPF/CNPJ.'),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
});

type ClientFormData = z.infer<typeof clientSchema>;

/** `FE2`: cadastro/busca de clientes. */
export default function ClientsPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [open, setOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [priceListClient, setPriceListClient] = React.useState<clientsApi.Client | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['clients', search, page],
    queryFn: () => clientsApi.listClients({ search: search || undefined, limit: 20, page }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({ resolver: zodResolver(clientSchema) });

  const createMutation = useMutation({
    mutationFn: clientsApi.createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setOpen(false);
      reset();
      setFormError(null);
    },
    onError: (error) => setFormError(extractApiErrorMessage(error)),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Users className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Clientes</h1>
            <p className="text-sm text-muted-foreground">Cadastro e busca de clientes.</p>
          </div>
        </div>
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus /> Novo cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo cliente</DialogTitle>
              </DialogHeader>
              <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => createMutation.mutate(values))} noValidate>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                  <Input id="cpf_cnpj" {...register('cpf_cnpj')} />
                  {errors.cpf_cnpj && <p className="text-sm text-destructive">{errors.cpf_cnpj.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" {...register('phone')} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" {...register('email')} />
                    {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                  </div>
                </div>
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                    {isSubmitting ? 'Salvando...' : 'Criar cliente'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Input
        aria-label="Buscar clientes por nome ou CPF/CNPJ"
        placeholder="Buscar por nome ou CPF/CNPJ..."
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        className="max-w-sm"
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>CPF/CNPJ</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>E-mail</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={5} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-destructive">
                Não foi possível carregar os clientes. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((client) => (
            <TableRow
              key={client.id}
              className="border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5"
            >
              <TableCell>{client.name}</TableCell>
              <TableCell>{client.cpf_cnpj}</TableCell>
              <TableCell>{client.phone ?? '-'}</TableCell>
              <TableCell>{client.email ?? '-'}</TableCell>
              {canWrite && (
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => setPriceListClient(client)}>
                    <Tags className="size-4" /> Tabela de preços
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Nenhum cliente encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <CustomerPriceListDialog client={priceListClient} onClose={() => setPriceListClient(null)} />
    </div>
  );
}

const priceFormSchema = z.object({
  product_id: z.coerce.number().int().positive('Selecione um produto.'),
  unit_price: z.coerce.number().positive('Preço deve ser maior que zero.'),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
});

type PriceFormData = z.infer<typeof priceFormSchema>;

/**
 * Dialog "Tabela de preços" (gap 1/3, "Tabela de preços por cliente") —
 * lista, cadastra e desativa preços negociados de um cliente para produtos
 * específicos. O preço aqui cadastrado passa a ser sugerido automaticamente
 * ao adicionar aquele produto num pedido de venda daquele cliente (o
 * vendedor sempre pode sobrescrever manualmente).
 */
function CustomerPriceListDialog({ client, onClose }: { client: clientsApi.Client | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<string | null>(null);

  const { data: prices, isLoading } = useQuery({
    queryKey: ['customer-prices', client?.id],
    queryFn: () => salesApi.listCustomerPrices(client!.id),
    enabled: Boolean(client),
  });
  const { data: products } = useQuery({ queryKey: ['products-all'], queryFn: () => productsApi.listProducts({ limit: 200 }) });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PriceFormData>({ resolver: zodResolver(priceFormSchema) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['customer-prices', client?.id] });

  const createMutation = useMutation({
    mutationFn: (input: PriceFormData) =>
      salesApi.createCustomerPrice(client!.id, {
        product_id: input.product_id,
        unit_price: input.unit_price,
        valid_from: input.valid_from || undefined,
        valid_until: input.valid_until || undefined,
      }),
    onSuccess: () => {
      invalidate();
      reset();
      setFormError(null);
    },
    onError: (error) => setFormError(extractApiErrorMessage(error)),
  });

  const deactivateMutation = useMutation({
    mutationFn: (priceId: number) => salesApi.deactivateCustomerPrice(client!.id, priceId),
    onSuccess: () => invalidate(),
  });

  return (
    <Dialog open={Boolean(client)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tabela de preços — {client?.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableSkeletonRows columns={5} />}
              {prices?.map((price) => (
                <TableRow key={price.id}>
                  <TableCell>{price.product ? `${price.product.code} — ${price.product.name}` : price.product_id}</TableCell>
                  <TableCell className="text-right tabular-nums">R$ {Number(price.unit_price).toFixed(2)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {price.valid_from ?? '—'} a {price.valid_until ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={price.active ? 'success' : 'secondary'}>{price.active ? 'Ativo' : 'Inativo'}</Badge>
                  </TableCell>
                  <TableCell>
                    {price.active && (
                      <Button size="sm" variant="ghost" onClick={() => deactivateMutation.mutate(price.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && prices?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum preço cadastrado para este cliente.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <form
            className="flex flex-col gap-3 rounded-lg border p-4"
            onSubmit={handleSubmit((values) => createMutation.mutate(values))}
            noValidate
          >
            <p className="text-sm font-semibold">Novo preço</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product_id">Produto</Label>
                <SelectNative id="product_id" {...register('product_id')} defaultValue="">
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {products?.data.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.code} — {product.name}
                    </option>
                  ))}
                </SelectNative>
                {errors.product_id && <p className="text-sm text-destructive">{errors.product_id.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="unit_price">Preço unitário</Label>
                <Input id="unit_price" type="number" step="any" {...register('unit_price')} />
                {errors.unit_price && <p className="text-sm text-destructive">{errors.unit_price.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="valid_from">Início da vigência (opcional)</Label>
                <Input id="valid_from" type="date" {...register('valid_from')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="valid_until">Fim da vigência (opcional)</Label>
                <Input id="valid_until" type="date" {...register('valid_until')} />
              </div>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div>
              <Button type="submit" size="sm" disabled={isSubmitting || createMutation.isPending}>
                <Plus className="size-3" /> {createMutation.isPending ? 'Salvando...' : 'Adicionar preço'}
              </Button>
            </div>
          </form>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
