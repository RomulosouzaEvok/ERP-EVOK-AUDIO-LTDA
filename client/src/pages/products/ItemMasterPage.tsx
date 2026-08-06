import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';

import * as itemsApi from '@/api/items';
import { translateApiError } from '@/lib/translateApiError';
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

const ITEM_TYPES: itemsApi.ItemType[] = ['MATERIA_PRIMA', 'SUBCONJUNTO', 'PRODUTO_ACABADO', 'USO_E_CONSUMO', 'ATIVO_IMOBILIZADO'];

export const ITEM_TYPE_LABEL: Record<itemsApi.ItemType, string> = {
  MATERIA_PRIMA: 'Matéria-prima',
  SUBCONJUNTO: 'Subconjunto',
  PRODUTO_ACABADO: 'Produto acabado',
  USO_E_CONSUMO: 'Uso e consumo (MRO)',
  ATIVO_IMOBILIZADO: 'Ativo imobilizado',
};

const ITEM_STATUSES = ['ATIVO', 'INATIVO', 'BLOQUEADO'] as const;

const createItemSchema = z.object({
  codigo: z.string().trim().min(1, 'Informe o código.'),
  descricao: z.string().trim().min(1, 'Informe a descrição.'),
  tipo: z.enum(['MATERIA_PRIMA', 'SUBCONJUNTO', 'PRODUTO_ACABADO', 'USO_E_CONSUMO', 'ATIVO_IMOBILIZADO']),
  unidade: z.string().trim().min(1, 'Informe a unidade (ex.: UN, KG).'),
  estoque_atual: z.coerce.number().min(0).optional(),
  estoque_seguranca: z.coerce.number().min(0).optional(),
  lote_minimo: z.coerce.number().min(0).optional(),
  lead_time_dias: z.coerce.number().int().min(0).optional(),
  custo_padrao: z.coerce.number().min(0).optional(),
});

type CreateItemFormData = z.infer<typeof createItemSchema>;

/**
 * `/products/items` — cadastro mestre canônico (`Item`, núcleo do MRP,
 * `CLAUDE.md` §4 "Item Core Intocado + Extensões"), distinto do legado
 * `/products` (`Product`). Lista/busca/filtra os 5 tipos de item; o
 * detalhe (edição, ficha técnica Thiele-Small, fornecedores, estrutura/BOM)
 * fica em `ItemMasterDetailPage` (`/products/items/:codigo`).
 *
 * Constrói apenas o que `GET /api/items` suporta de fato (ver `docs/API.md`
 * §31): busca por `codigo`/`descricao`, filtro por `tipo`/`status`,
 * paginação. Não há endpoint de exclusão física — apenas inativação, feita
 * na tela de detalhe.
 */
export default function ItemMasterPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [tipoFilter, setTipoFilter] = React.useState<itemsApi.ItemType | ''>('');
  const [statusFilter, setStatusFilter] = React.useState<(typeof ITEM_STATUSES)[number] | ''>('');
  const [page, setPage] = React.useState(1);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<ReturnType<typeof translateApiError> | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['items-master', search, tipoFilter, statusFilter, page],
    queryFn: () =>
      itemsApi.listItems({
        search: search || undefined,
        tipo: tipoFilter || undefined,
        status: statusFilter || undefined,
        limit: 20,
        page,
      } as itemsApi.ItemListParams & { tipo?: string; status?: string }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateItemFormData>({
    resolver: zodResolver(createItemSchema),
    defaultValues: { tipo: 'MATERIA_PRIMA' },
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateItemFormData) => itemsApi.createItem(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items-master'] });
      setCreateOpen(false);
      reset({ tipo: 'MATERIA_PRIMA' });
      setFormError(null);
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível criar o item')),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Item Mestre</h1>
          <p className="text-sm text-muted-foreground">
            Cadastro canônico (<code className="text-xs">Item</code>) usado por BOM, MRP e rastreabilidade.
          </p>
        </div>
        {canWrite && (
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) {
                reset({ tipo: 'MATERIA_PRIMA' });
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
                <DialogTitle>Novo item mestre</DialogTitle>
              </DialogHeader>
              <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => createMutation.mutate(values))} noValidate>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="codigo">Código</Label>
                    <Input id="codigo" {...register('codigo')} />
                    {errors.codigo && <p className="text-sm text-destructive">{errors.codigo.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="tipo">Tipo</Label>
                    <SelectNative id="tipo" {...register('tipo')}>
                      {ITEM_TYPES.map((value) => (
                        <option key={value} value={value}>
                          {ITEM_TYPE_LABEL[value]}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input id="descricao" {...register('descricao')} />
                  {errors.descricao && <p className="text-sm text-destructive">{errors.descricao.message}</p>}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="unidade">Unidade</Label>
                    <Input id="unidade" placeholder="UN, KG, PC..." {...register('unidade')} />
                    {errors.unidade && <p className="text-sm text-destructive">{errors.unidade.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="estoque_atual">Estoque inicial</Label>
                    <Input id="estoque_atual" type="number" step="any" {...register('estoque_atual')} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="custo_padrao">Custo padrão</Label>
                    <Input id="custo_padrao" type="number" step="any" {...register('custo_padrao')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="estoque_seguranca">Estoque de segurança</Label>
                    <Input id="estoque_seguranca" type="number" step="any" {...register('estoque_seguranca')} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="lote_minimo">Lote mínimo</Label>
                    <Input id="lote_minimo" type="number" step="any" {...register('lote_minimo')} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 max-w-xs">
                  <Label htmlFor="lead_time_dias">Lead time (dias)</Label>
                  <Input id="lead_time_dias" type="number" {...register('lead_time_dias')} />
                </div>
                {formError && <DidacticAlert error={formError} />}
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                    {isSubmitting || createMutation.isPending ? 'Salvando...' : 'Criar item'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
        <Label htmlFor="tipo-filter" className="text-sm text-muted-foreground">
          Tipo
        </Label>
        <SelectNative
          id="tipo-filter"
          className="w-56"
          value={tipoFilter}
          onChange={(event) => {
            setTipoFilter(event.target.value as itemsApi.ItemType | '');
            setPage(1);
          }}
        >
          <option value="">Todos os tipos</option>
          {ITEM_TYPES.map((value) => (
            <option key={value} value={value}>
              {ITEM_TYPE_LABEL[value]}
            </option>
          ))}
        </SelectNative>
        <Label htmlFor="status-filter" className="text-sm text-muted-foreground">
          Status
        </Label>
        <SelectNative
          id="status-filter"
          className="w-40"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as (typeof ITEM_STATUSES)[number] | '');
            setPage(1);
          }}
        >
          <option value="">Todos</option>
          {ITEM_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </SelectNative>
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
          {data?.data.map((item) => (
            <TableRow key={item.id} className="cursor-pointer hover:bg-accent/50">
              <TableCell className="p-0">
                <Link to={`/products/items/${encodeURIComponent(item.codigo)}`} className="block px-4 py-2 font-medium">
                  {item.codigo}
                </Link>
              </TableCell>
              <TableCell>
                <Link to={`/products/items/${encodeURIComponent(item.codigo)}`} className="block">
                  {item.descricao}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{ITEM_TYPE_LABEL[item.tipo] ?? item.tipo}</Badge>
              </TableCell>
              <TableCell>{item.unidade}</TableCell>
              <TableCell>{Number(item.estoque_atual)}</TableCell>
              <TableCell>
                <Badge variant={item.status === 'ATIVO' ? 'success' : item.status === 'BLOQUEADO' ? 'warning' : 'secondary'}>
                  {item.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhum item encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />
    </div>
  );
}
