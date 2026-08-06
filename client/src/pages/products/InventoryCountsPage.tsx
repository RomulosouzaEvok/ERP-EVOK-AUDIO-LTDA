import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ClipboardList, Plus } from 'lucide-react';

import * as inventoryApi from '@/api/inventory';
import * as productsApi from '@/api/products';
import * as warehousesApi from '@/api/warehouses';
import * as usersApi from '@/api/users';
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
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { DidacticAlert } from '@/components/DidacticAlert';
import { Pagination } from '@/components/Pagination';

const STATUS_LABEL: Record<inventoryApi.InventoryCountStatus, string> = {
  draft: 'Rascunho',
  counting: 'Em contagem',
  pending_approval: 'Aguardando aprovação',
  approved: 'Aprovada',
  adjusted: 'Ajustada',
  rejected: 'Rejeitada',
};

const createCountSchema = z.object({
  warehouse_id: z.coerce.number({ message: 'Selecione o depósito.' }).int().positive('Selecione o depósito.'),
  location: z.string().trim().max(100).optional(),
  assigned_to: z.coerce.number().int().positive().optional(),
});

type CreateCountFormData = z.infer<typeof createCountSchema>;

/**
 * Resolve `code — name` de um depósito a partir do `id` (a listagem/detalhe
 * de contagens do backend não faz eager-load da associação `warehouse`, ver
 * `SequelizeInventoryCountRepository.ts` — a tela reaproveita
 * `listWarehouses()` e monta o rótulo aqui).
 */
function warehouseLabel(warehouses: warehousesApi.Warehouse[] | undefined, warehouseId: number | null): string {
  if (!warehouseId) return '—';
  const warehouse = warehouses?.find((w) => w.id === warehouseId);
  return warehouse ? `${warehouse.code} — ${warehouse.name}` : `Depósito #${warehouseId}`;
}

/** `FE1`: contagem de inventário cíclico — criar (escopada a um depósito), contar item a item, submeter, aprovar/rejeitar. */
export default function InventoryCountsPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const canApprove = hasRole('admin');
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [selectedProductIds, setSelectedProductIds] = React.useState<number[]>([]);
  const [openCountId, setOpenCountId] = React.useState<number | null>(null);
  const [page, setPage] = React.useState(1);
  const [createFormError, setCreateFormError] = React.useState<DidacticError | null>(null);
  const [approveError, setApproveError] = React.useState<DidacticError | null>(null);
  /** Filtro de responsável: `''` (todas), `'unassigned'` (pool) ou o `id` do usuário. */
  const [assignmentFilter, setAssignmentFilter] = React.useState<string>('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['inventory-counts', page, assignmentFilter],
    queryFn: () =>
      inventoryApi.listInventoryCounts({
        limit: 20,
        page,
        unassigned: assignmentFilter === 'unassigned' ? true : undefined,
        assigned_to: assignmentFilter && assignmentFilter !== 'unassigned' ? Number(assignmentFilter) : undefined,
      }),
  });
  const { data: products } = useQuery({ queryKey: ['products-all'], queryFn: () => productsApi.listProducts({ limit: 200 }) });
  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.listWarehouses });
  const { data: users } = useQuery({ queryKey: ['users-all-active'], queryFn: () => usersApi.listUsers({ limit: 200, active: true }) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
  const onError = (error: unknown) => window.alert(extractApiErrorMessage(error));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCountFormData>({
    resolver: zodResolver(createCountSchema),
    defaultValues: { warehouse_id: undefined, location: '', assigned_to: undefined },
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateCountFormData) =>
      inventoryApi.createInventoryCount({
        warehouse_id: values.warehouse_id,
        location: values.location?.trim() || undefined,
        product_ids: selectedProductIds,
        assigned_to: values.assigned_to || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setSelectedProductIds([]);
      reset({ warehouse_id: undefined, location: '', assigned_to: undefined });
      setCreateFormError(null);
    },
    onError: (error) => setCreateFormError(translateApiError(error, 'Não foi possível criar a contagem de inventário')),
  });
  const startMutation = useMutation({ mutationFn: inventoryApi.startInventoryCount, onSuccess: invalidate, onError });
  const submitMutation = useMutation({ mutationFn: inventoryApi.submitInventoryCount, onSuccess: invalidate, onError });
  const approveMutation = useMutation({
    mutationFn: inventoryApi.approveInventoryCount,
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setApproveError(null);
    },
    onError: (error) =>
      setApproveError(
        translateApiError(
          error,
          'Não foi possível aprovar a contagem',
          undefined,
          'A variância negativa não pôde ser aplicada porque o depósito contado não tem saldo suficiente. Isso é intencional — confira a contagem antes de reenviar.',
        ),
      ),
  });
  const rejectMutation = useMutation({ mutationFn: (id: number) => inventoryApi.rejectInventoryCount(id), onSuccess: invalidate, onError });

  function toggleProduct(id: number) {
    setSelectedProductIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <ClipboardList className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Contagem de inventário</h1>
            <p className="text-sm text-muted-foreground">
              Contagem cíclica escopada a um depósito — a aprovação ajusta apenas o saldo do depósito contado.
            </p>
          </div>
        </div>
        {canWrite && (
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) {
                setSelectedProductIds([]);
                reset({ warehouse_id: undefined, location: '', assigned_to: undefined });
                setCreateFormError(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus /> Nova contagem
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova contagem de inventário</DialogTitle>
              </DialogHeader>
              <form
                className="flex flex-col gap-3"
                noValidate
                onSubmit={handleSubmit((values) => createMutation.mutate(values))}
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="count-warehouse">Depósito *</Label>
                  <select
                    id="count-warehouse"
                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                    defaultValue=""
                    {...register('warehouse_id')}
                  >
                    <option value="" disabled>
                      Selecione o depósito a contar
                    </option>
                    {warehouses?.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.code} — {warehouse.name}
                      </option>
                    ))}
                  </select>
                  {errors.warehouse_id && <p className="text-sm text-destructive">{errors.warehouse_id.message}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="count-location">Local/área (opcional)</Label>
                  <Input id="count-location" placeholder="Ex.: Corredor A, Prateleira 3" {...register('location')} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="count-assigned-to">Atribuir a (opcional)</Label>
                  <SelectNative id="count-assigned-to" defaultValue="" {...register('assigned_to')}>
                    <option value="">Deixar disponível (pool) — qualquer funcionário pode pegar</option>
                    {users?.data.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </SelectNative>
                  <p className="text-xs text-muted-foreground">
                    Se não for atribuída a ninguém, a contagem fica disponível no app mobile para qualquer funcionário
                    autorizado pegar ("pool"). Se um funcionário for selecionado, apenas ele poderá iniciá-la.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Produtos a contar *</Label>
                  <div className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-md border p-1">
                    {products?.data.map((product) => (
                      <label key={product.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(product.id)}
                          onChange={() => toggleProduct(product.id)}
                        />
                        {product.code} — {product.name}
                      </label>
                    ))}
                  </div>
                  {selectedProductIds.length === 0 && (
                    <p className="text-xs text-muted-foreground">Selecione ao menos um produto.</p>
                  )}
                </div>

                {createFormError && <DidacticAlert error={createFormError} />}

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || isSubmitting || selectedProductIds.length === 0}
                  >
                    {createMutation.isPending ? 'Salvando...' : `Criar contagem (${selectedProductIds.length} itens)`}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {approveError && <DidacticAlert error={approveError} />}

      <div className="flex flex-col gap-1.5 sm:w-72">
        <Label htmlFor="count-assignment-filter">Filtrar por responsável</Label>
        <SelectNative
          id="count-assignment-filter"
          value={assignmentFilter}
          onChange={(event) => {
            setAssignmentFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Todas as contagens</option>
          <option value="unassigned">Sem responsável (pool)</option>
          {users?.data.map((user) => (
            <option key={user.id} value={user.id}>
              Atribuídas a {user.name}
            </option>
          ))}
        </SelectNative>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Depósito</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Criada em</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-destructive">
                Não foi possível carregar as contagens. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((count) => (
            <TableRow key={count.id}>
              <TableCell>{count.count_number}</TableCell>
              <TableCell>{warehouseLabel(warehouses, count.warehouse_id)}</TableCell>
              <TableCell>
                {count.assignedTo ? (
                  <span className="text-sm">{count.assignedTo.name}</span>
                ) : (
                  <Badge variant="outline">Disponível (pool)</Badge>
                )}
              </TableCell>
              <TableCell>{new Date(count.createdAt).toLocaleString('pt-BR')}</TableCell>
              <TableCell>
                <Badge variant="secondary">{STATUS_LABEL[count.status]}</Badge>
              </TableCell>
              <TableCell className="flex gap-2">
                {canWrite && count.status === 'draft' && (
                  <Button size="sm" variant="outline" onClick={() => startMutation.mutate(count.id)}>
                    Iniciar
                  </Button>
                )}
                {canWrite && count.status === 'counting' && (
                  <Button size="sm" onClick={() => setOpenCountId(count.id)}>
                    Contar itens
                  </Button>
                )}
                {canApprove && count.status === 'pending_approval' && (
                  <>
                    <Button
                      size="sm"
                      disabled={approveMutation.isPending}
                      onClick={() => {
                        setApproveError(null);
                        approveMutation.mutate(count.id);
                      }}
                    >
                      Aprovar (ajusta estoque do depósito)
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => rejectMutation.mutate(count.id)}>
                      Rejeitar
                    </Button>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhuma contagem registrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <CountItemsDialog countId={openCountId} onClose={() => setOpenCountId(null)} onSubmitted={submitMutation.mutate} />
    </div>
  );
}

function CountItemsDialog({
  countId,
  onClose,
  onSubmitted,
}: {
  countId: number | null;
  onClose: () => void;
  onSubmitted: (id: number) => void;
}) {
  const queryClient = useQueryClient();
  const [values, setValues] = React.useState<Record<number, string>>({});
  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.listWarehouses });

  const { data: count } = useQuery({
    queryKey: ['inventory-count', countId],
    queryFn: () => inventoryApi.getInventoryCount(countId!),
    enabled: countId !== null,
  });

  const countMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      inventoryApi.countInventoryItem(countId!, itemId, quantity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory-count', countId] }),
    onError: (error) => window.alert(extractApiErrorMessage(error)),
  });

  const allCounted = count?.items?.every((item) => item.status !== 'pending') ?? false;

  return (
    <Dialog open={countId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Contar itens — {count?.count_number}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Depósito: <span className="font-medium text-foreground">{warehouseLabel(warehouses, count?.warehouse_id ?? null)}</span>
          {' · '}
          Responsável:{' '}
          <span className="font-medium text-foreground">
            {count?.assignedTo ? count.assignedTo.name : 'Disponível (pool)'}
          </span>
        </p>
        <div className="flex flex-col gap-2">
          {count?.items?.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 border-b pb-2">
              <div className="text-sm">
                <p>{item.product?.name ?? item.product_id}</p>
                <p className="text-xs text-muted-foreground">
                  Sistema: {item.system_quantity}
                  {item.counted_quantity !== null && (
                    <>
                      {' '}
                      · Contado: {item.counted_quantity} · Variância: {item.variance_quantity}
                    </>
                  )}
                </p>
              </div>
              {item.status === 'pending' ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="any"
                    className="w-28"
                    value={values[item.id] ?? ''}
                    onChange={(event) => setValues((prev) => ({ ...prev, [item.id]: event.target.value }))}
                  />
                  <Button
                    size="sm"
                    disabled={!values[item.id] || countMutation.isPending}
                    onClick={() => countMutation.mutate({ itemId: item.id, quantity: Number(values[item.id]) })}
                  >
                    Salvar
                  </Button>
                </div>
              ) : (
                <Badge variant="success">Contado</Badge>
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button
            disabled={!allCounted}
            onClick={() => {
              onSubmitted(countId!);
              onClose();
            }}
          >
            Submeter para aprovação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
