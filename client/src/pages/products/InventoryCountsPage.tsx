import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import * as inventoryApi from '@/api/inventory';
import * as productsApi from '@/api/products';
import { extractApiErrorMessage } from '@/api/httpClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const STATUS_LABEL: Record<inventoryApi.InventoryCountStatus, string> = {
  draft: 'Rascunho',
  counting: 'Em contagem',
  pending_approval: 'Aguardando aprovação',
  approved: 'Aprovada',
  adjusted: 'Ajustada',
  rejected: 'Rejeitada',
};

/** `FE1`: contagem de inventário cíclico — criar com produtos, contar item a item, submeter, aprovar/rejeitar. */
export default function InventoryCountsPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const canApprove = hasRole('admin');
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [selectedProductIds, setSelectedProductIds] = React.useState<number[]>([]);
  const [openCountId, setOpenCountId] = React.useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['inventory-counts'],
    queryFn: () => inventoryApi.listInventoryCounts({ limit: 50 }),
  });
  const { data: products } = useQuery({ queryKey: ['products-all'], queryFn: () => productsApi.listProducts({ limit: 200 }) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
  const onError = (error: unknown) => window.alert(extractApiErrorMessage(error));

  const createMutation = useMutation({
    mutationFn: () => inventoryApi.createInventoryCount({ product_ids: selectedProductIds }),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setSelectedProductIds([]);
    },
    onError,
  });
  const startMutation = useMutation({ mutationFn: inventoryApi.startInventoryCount, onSuccess: invalidate, onError });
  const submitMutation = useMutation({ mutationFn: inventoryApi.submitInventoryCount, onSuccess: invalidate, onError });
  const approveMutation = useMutation({
    mutationFn: inventoryApi.approveInventoryCount,
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError,
  });
  const rejectMutation = useMutation({ mutationFn: (id: number) => inventoryApi.rejectInventoryCount(id), onSuccess: invalidate, onError });

  function toggleProduct(id: number) {
    setSelectedProductIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Contagem de inventário</h1>
        {canWrite && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus /> Nova contagem
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova contagem de inventário</DialogTitle>
              </DialogHeader>
              <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
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
              <DialogFooter>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || selectedProductIds.length === 0}
                >
                  {createMutation.isPending ? 'Salvando...' : `Criar contagem (${selectedProductIds.length} itens)`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Criada em</TableHead>
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
                Não foi possível carregar as contagens. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((count) => (
            <TableRow key={count.id}>
              <TableCell>{count.count_number}</TableCell>
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
                    <Button size="sm" onClick={() => approveMutation.mutate(count.id)}>
                      Aprovar (ajusta estoque)
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
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Nenhuma contagem registrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

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
