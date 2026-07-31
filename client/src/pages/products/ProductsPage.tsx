import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';

import * as productsApi from '@/api/products';
import { extractApiErrorMessage } from '@/api/httpClient';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';

const productSchema = z.object({
  name: z.string().min(1, 'Informe o nome.'),
  code: z.string().min(1, 'Informe o código.'),
  category_id: z.coerce.number().int().positive('Selecione uma categoria.'),
  unit: z.string().min(1, 'Informe a unidade (ex.: UN, KG).'),
  quantity: z.coerce.number().min(0),
  min_quantity: z.coerce.number().min(0),
  cost_price: z.coerce.number().min(0),
  price: z.coerce.number().min(0),
});

type ProductFormData = z.infer<typeof productSchema>;

/** `FE1`: listagem, cadastro e inativação de produtos, com movimentação manual de estoque. */
export default function ProductsPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [movementProduct, setMovementProduct] = React.useState<productsApi.Product | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: () => productsApi.listProducts({ search: search || undefined, limit: 50 }),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: productsApi.listCategories,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({ resolver: zodResolver(productSchema) });

  const createMutation = useMutation({
    mutationFn: productsApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setCreateOpen(false);
      reset();
      setFormError(null);
    },
    onError: (error) => setFormError(extractApiErrorMessage(error)),
  });

  const deactivateMutation = useMutation({
    mutationFn: productsApi.deactivateProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
    onError: (error) => window.alert(extractApiErrorMessage(error, 'Não foi possível inativar o produto.')),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Produtos e estoque</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/products/inventory-counts">Contagem de inventário</Link>
          </Button>
          {canWrite && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus /> Novo produto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo produto</DialogTitle>
                </DialogHeader>
                <form
                  className="flex flex-col gap-3"
                  onSubmit={handleSubmit((values) => createMutation.mutate(values))}
                  noValidate
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="name">Nome</Label>
                      <Input id="name" {...register('name')} />
                      {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="code">Código</Label>
                      <Input id="code" {...register('code')} />
                      {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="category_id">Categoria</Label>
                      <SelectNative id="category_id" {...register('category_id')} defaultValue="">
                        <option value="" disabled>
                          Selecione...
                        </option>
                        {categories?.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </SelectNative>
                      {errors.category_id && <p className="text-sm text-destructive">{errors.category_id.message}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="unit">Unidade</Label>
                      <Input id="unit" placeholder="UN, KG, M..." {...register('unit')} />
                      {errors.unit && <p className="text-sm text-destructive">{errors.unit.message}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="quantity">Quantidade inicial</Label>
                      <Input id="quantity" type="number" step="any" {...register('quantity')} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="min_quantity">Estoque mínimo</Label>
                      <Input id="min_quantity" type="number" step="any" {...register('min_quantity')} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="cost_price">Preço de custo</Label>
                      <Input id="cost_price" type="number" step="any" {...register('cost_price')} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="price">Preço de venda</Label>
                      <Input id="price" type="number" step="any" {...register('price')} />
                    </div>
                  </div>
                  {formError && <p className="text-sm text-destructive">{formError}</p>}
                  <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Salvando...' : 'Criar produto'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Input
        placeholder="Buscar por nome ou código..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="max-w-sm"
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Estoque</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Status</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={6}>Carregando...</TableCell>
            </TableRow>
          )}
          {data?.data.map((product) => {
            const quantity = Number(product.quantity);
            const minQuantity = Number(product.min_quantity);
            const isLow = quantity <= minQuantity;
            return (
              <TableRow key={product.id}>
                <TableCell>{product.code}</TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell>
                  <span className={isLow ? 'font-medium text-destructive' : ''}>{quantity}</span>{' '}
                  <span className="text-xs text-muted-foreground">/ mín. {minQuantity}</span>
                </TableCell>
                <TableCell>R$ {Number(product.price).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={product.status === 'active' ? 'success' : 'secondary'}>
                    {product.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                {canWrite && (
                  <TableCell className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setMovementProduct(product)}>
                      Movimentar
                    </Button>
                    {product.status === 'active' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm(`Inativar o produto "${product.name}"?`)) {
                            deactivateMutation.mutate(product.id);
                          }
                        }}
                      >
                        Inativar
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
          {!isLoading && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhum produto encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <StockMovementDialog product={movementProduct} onClose={() => setMovementProduct(null)} />
    </div>
  );
}

const movementSchema = z.object({
  type: z.enum(['in', 'out']),
  quantity: z.coerce.number().positive('Informe uma quantidade maior que zero.'),
  description: z.string().max(500).optional(),
});

type MovementFormData = z.infer<typeof movementSchema>;

function StockMovementDialog({ product, onClose }: { product: productsApi.Product | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MovementFormData>({ resolver: zodResolver(movementSchema), defaultValues: { type: 'in' } });

  const mutation = useMutation({
    mutationFn: (values: MovementFormData) =>
      productsApi.createStockMovement({ product_id: product!.id, ...values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      reset();
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(extractApiErrorMessage(error)),
  });

  return (
    <Dialog open={Boolean(product)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Movimentar estoque — {product?.name}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type">Tipo</Label>
            <SelectNative id="type" {...register('type')}>
              <option value="in">Entrada</option>
              <option value="out">Saída</option>
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quantity">Quantidade</Label>
            <Input id="quantity" type="number" step="any" {...register('quantity')} />
            {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Motivo (opcional)</Label>
            <Input id="description" {...register('description')} />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || !product}>
              {isSubmitting ? 'Salvando...' : 'Confirmar movimentação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
