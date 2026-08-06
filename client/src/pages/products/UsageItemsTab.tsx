import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';

import * as itemsApi from '@/api/items';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
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

const USAGE_ITEM_TYPES = ['USO_E_CONSUMO', 'ATIVO_IMOBILIZADO'] as const;

const TYPE_LABEL: Record<(typeof USAGE_ITEM_TYPES)[number], string> = {
  USO_E_CONSUMO: 'Uso e consumo (MRO)',
  ATIVO_IMOBILIZADO: 'Ativo imobilizado',
};

const usageItemSchema = z.object({
  codigo: z.string().trim().min(1, 'Informe o código.'),
  descricao: z.string().trim().min(1, 'Informe a descrição.'),
  tipo: z.enum(USAGE_ITEM_TYPES),
  unidade: z.string().trim().min(1, 'Informe a unidade (ex.: UN, KG).'),
  estoque_atual: z.coerce.number().min(0).optional(),
  custo_padrao: z.coerce.number().min(0).optional(),
});

type UsageItemFormData = z.infer<typeof usageItemSchema>;

/**
 * Aba "Uso e consumo / Ativo" da tela de Produtos (Bloco E,
 * `docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md`) — cadastro
 * separado para os dois novos valores de `Item.type` (MRO/capital asset),
 * mantendo a listagem principal de `ProductsPage` (matéria-prima/
 * subconjunto/produto acabado) sem poluição. Usa o `Item` mestre
 * (`/api/items`), não o modelo `Product` legado — decisão documentada no
 * handoff: itens que não giram em torno do BOM/MRP não precisam das
 * extensões comerciais/técnicas do `Product`.
 */
export function UsageItemsTab() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<(typeof USAGE_ITEM_TYPES)[number] | ''>('');
  const [page, setPage] = React.useState(1);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['items', 'usage', typeFilter, search, page],
    queryFn: () =>
      itemsApi.listItems({
        search: search || undefined,
        limit: 20,
        page,
      }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UsageItemFormData>({
    resolver: zodResolver(usageItemSchema),
    defaultValues: { tipo: 'USO_E_CONSUMO' },
  });

  const createMutation = useMutation({
    mutationFn: (values: UsageItemFormData) =>
      itemsApi.createItem({
        codigo: values.codigo,
        descricao: values.descricao,
        tipo: values.tipo,
        unidade: values.unidade,
        estoque_atual: values.estoque_atual,
        custo_padrao: values.custo_padrao,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setCreateOpen(false);
      reset({ tipo: 'USO_E_CONSUMO' });
      setFormError(null);
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível criar o item')),
  });

  // Filtra client-side pelos dois tipos de uso/ativo — a listagem geral de
  // `/api/items` traz todos os tipos, então restringe aqui para não
  // misturar matéria-prima/subconjunto/produto acabado nesta aba.
  const rows = (data?.data ?? []).filter((item) =>
    typeFilter ? item.tipo === typeFilter : USAGE_ITEM_TYPES.includes(item.tipo as (typeof USAGE_ITEM_TYPES)[number]),
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Itens que não fazem parte do BOM/estrutura de produto — material de uso e consumo (MRO, ex.: luva de
        proteção, item de limpeza) ou ativo imobilizado. Fica fora da listagem de matéria-prima para não poluir a
        engenharia de produto.
      </p>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Input
            aria-label="Buscar itens por código ou descrição"
            placeholder="Buscar por código ou descrição..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="max-w-sm"
          />
          <Label htmlFor="usage-type-filter" className="text-sm text-muted-foreground">
            Tipo
          </Label>
          <SelectNative
            id="usage-type-filter"
            className="w-56"
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value as (typeof USAGE_ITEM_TYPES)[number] | '');
              setPage(1);
            }}
          >
            <option value="">Todos (uso e consumo + ativo)</option>
            {USAGE_ITEM_TYPES.map((value) => (
              <option key={value} value={value}>
                {TYPE_LABEL[value]}
              </option>
            ))}
          </SelectNative>
        </div>

        {canWrite && (
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) {
                reset({ tipo: 'USO_E_CONSUMO' });
                setFormError(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus /> Novo item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo item de uso e consumo / ativo</DialogTitle>
              </DialogHeader>
              <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => createMutation.mutate(values))} noValidate>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="usage-codigo">Código</Label>
                    <Input id="usage-codigo" {...register('codigo')} />
                    {errors.codigo && <p className="text-sm text-destructive">{errors.codigo.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="usage-tipo">Tipo</Label>
                    <SelectNative id="usage-tipo" {...register('tipo')}>
                      {USAGE_ITEM_TYPES.map((value) => (
                        <option key={value} value={value}>
                          {TYPE_LABEL[value]}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="usage-descricao">Descrição</Label>
                  <Input id="usage-descricao" {...register('descricao')} />
                  {errors.descricao && <p className="text-sm text-destructive">{errors.descricao.message}</p>}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="usage-unidade">Unidade</Label>
                    <Input id="usage-unidade" placeholder="UN, KG, PC..." {...register('unidade')} />
                    {errors.unidade && <p className="text-sm text-destructive">{errors.unidade.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="usage-estoque">Estoque inicial</Label>
                    <Input id="usage-estoque" type="number" step="any" {...register('estoque_atual')} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="usage-custo">Custo padrão</Label>
                    <Input id="usage-custo" type="number" step="any" {...register('custo_padrao')} />
                  </div>
                </div>
                {formError && <DidacticAlert error={formError} />}
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                    {isSubmitting ? 'Salvando...' : 'Criar item'}
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
            <TableHead>Código</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Unidade</TableHead>
            <TableHead>Estoque atual</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-destructive">
                Não foi possível carregar os itens. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {rows.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.codigo}</TableCell>
              <TableCell>{item.descricao}</TableCell>
              <TableCell>
                <Badge variant="outline">{TYPE_LABEL[item.tipo as (typeof USAGE_ITEM_TYPES)[number]] ?? item.tipo}</Badge>
              </TableCell>
              <TableCell>{item.unidade}</TableCell>
              <TableCell>{Number(item.estoque_atual)}</TableCell>
              <TableCell>
                <Badge variant={item.status === 'ATIVO' ? 'success' : 'secondary'}>{item.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhum item de uso e consumo ou ativo imobilizado encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />
    </div>
  );
}
