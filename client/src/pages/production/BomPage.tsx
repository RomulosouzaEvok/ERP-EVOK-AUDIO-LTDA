import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';

import * as bomApi from '@/api/bom';
import * as productsApi from '@/api/products';
import { extractApiErrorMessage } from '@/api/httpClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const bomItemSchema = z.object({
  component_product_id: z.coerce.number().int().positive('Selecione um componente.'),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero.'),
});

const bomSchema = z.object({
  product_id: z.coerce.number().int().positive('Selecione o produto acabado.'),
  items: z.array(bomItemSchema).min(1, 'Adicione ao menos um componente.'),
});

type BomFormData = z.infer<typeof bomSchema>;

/** `FE4`: estrutura de produto (BOM) — criar e explodir. */
export default function BomPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [explodedBom, setExplodedBom] = React.useState<bomApi.Bom | null>(null);
  const [exploded, setExploded] = React.useState<bomApi.ExplodedComponent[] | null>(null);

  const { data, isLoading, isError } = useQuery({ queryKey: ['boms'], queryFn: () => bomApi.listBoms({ limit: 50 }) });
  const { data: products } = useQuery({ queryKey: ['products-all'], queryFn: () => productsApi.listProducts({ limit: 200 }) });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BomFormData>({
    resolver: zodResolver(bomSchema),
    defaultValues: { items: [{ component_product_id: undefined, quantity: 1 }] as never },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const createMutation = useMutation({
    mutationFn: bomApi.createBom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boms'] });
      setOpen(false);
      reset({ product_id: undefined, items: [{ component_product_id: undefined, quantity: 1 }] } as never);
      setFormError(null);
    },
    onError: (error) => setFormError(extractApiErrorMessage(error)),
  });

  async function handleExplode(bom: bomApi.Bom) {
    setExplodedBom(bom);
    try {
      const result = await bomApi.explodeBom(bom.id, 1);
      setExploded(result.components);
    } catch (error) {
      window.alert(extractApiErrorMessage(error, 'Não foi possível explodir a estrutura.'));
      setExplodedBom(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Estrutura de produto (BOM)</h1>
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus /> Nova estrutura
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nova estrutura de produto</DialogTitle>
              </DialogHeader>
              <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => createMutation.mutate(values))} noValidate>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="product_id">Produto acabado</Label>
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

                <div className="flex flex-col gap-2">
                  <Label>Componentes</Label>
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2">
                      <div className="flex-1">
                        <SelectNative {...register(`items.${index}.component_product_id`)} defaultValue="">
                          <option value="" disabled>
                            Componente...
                          </option>
                          {products?.data.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.code} — {product.name}
                            </option>
                          ))}
                        </SelectNative>
                      </div>
                      <Input type="number" step="any" placeholder="Qtd." className="w-24" {...register(`items.${index}.quantity`)} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                  {errors.items?.message && <p className="text-sm text-destructive">{errors.items.message}</p>}
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ component_product_id: undefined, quantity: 1 } as never)}>
                    <Plus className="size-3" /> Adicionar componente
                  </Button>
                </div>

                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                    {isSubmitting ? 'Salvando...' : 'Criar estrutura'}
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
            <TableHead>Produto acabado</TableHead>
            <TableHead>Revisão</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={4}>Carregando...</TableCell>
            </TableRow>
          )}
          {isError && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-destructive">
                Não foi possível carregar as estruturas. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((bom) => (
            <TableRow key={bom.id}>
              <TableCell>{bom.product?.name ?? bom.product_id}</TableCell>
              <TableCell>{bom.revision ?? '-'}</TableCell>
              <TableCell>
                <Badge variant={bom.status === 'active' ? 'success' : 'secondary'}>
                  {bom.status === 'active' ? 'Ativa' : 'Inativa'}
                </Badge>
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => handleExplode(bom)}>
                  Ver explosão
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Nenhuma estrutura cadastrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog
        open={Boolean(explodedBom)}
        onOpenChange={(open) => {
          if (!open) {
            setExplodedBom(null);
            setExploded(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Explosão — {explodedBom?.product?.name}</DialogTitle>
          </DialogHeader>
          <ul className="flex flex-col gap-1 text-sm">
            {exploded?.map((component, index) => (
              <li key={index} className="flex justify-between border-b py-1">
                <span>{component.component_name ?? component.component_id}</span>
                <span>{component.quantity}</span>
              </li>
            ))}
            {exploded?.length === 0 && <li className="text-muted-foreground">Sem componentes.</li>}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
