import * as React from 'react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Warehouse } from 'lucide-react';

import * as warehousesApi from '@/api/warehouses';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { DidacticAlert } from '@/components/DidacticAlert';

/**
 * `/logistics/warehouses` — cadastro (CRUD simples) de depósitos (Bloco 4,
 * UC-42, TODO.md Bloco 4.3). Criação/edição exigem `estoque:approve` (mesmo
 * nível exigido pelo backend em `POST/PUT /api/inventory/warehouses`) —
 * usuários com apenas leitura de `estoque` visualizam a tabela mas não veem
 * os botões de ação, espelhando o padrão de `TransfersTab.tsx`.
 *
 * Limitação conhecida (documentada também em `client/src/api/warehouses.ts`):
 * `GET /api/inventory/warehouses` só retorna depósitos ativos — um depósito
 * desativado por aqui desaparece da lista e a API atual não tem como
 * reativá-lo (não há parâmetro `include_inactive`). Ficou fora do escopo
 * desta entrega alterar o backend; a tela avisa isso no rodapé.
 */
export default function WarehousesPage() {
  const { hasRole, permissions } = useAuth();
  const canManage = hasRole('admin') || permissions?.estoque === 'approve';
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingWarehouse, setEditingWarehouse] = React.useState<warehousesApi.Warehouse | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehousesApi.listWarehouses,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Warehouse className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Depósitos</h1>
            <p className="text-sm text-muted-foreground">Cadastro dos depósitos usados na operação de múltiplos estoques.</p>
          </div>
        </div>
        {canManage && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus /> Novo depósito
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Situação</TableHead>
            {canManage && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={canManage ? 5 : 4} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={canManage ? 5 : 4} className="text-center text-destructive">
                Não foi possível carregar os depósitos. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.map((warehouse) => (
            <TableRow key={warehouse.id}>
              <TableCell className="font-mono text-xs">{warehouse.code}</TableCell>
              <TableCell>{warehouse.name}</TableCell>
              <TableCell className="max-w-96 truncate text-muted-foreground" title={warehouse.description ?? undefined}>
                {warehouse.description || '-'}
              </TableCell>
              <TableCell>
                <Badge variant={warehouse.active ? 'success' : 'secondary'}>{warehouse.active ? 'Ativo' : 'Inativo'}</Badge>
              </TableCell>
              {canManage && (
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => setEditingWarehouse(warehouse)}>
                    Editar
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.length === 0 && (
            <TableRow>
              <TableCell colSpan={canManage ? 5 : 4} className="text-center text-muted-foreground">
                Nenhum depósito cadastrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <p className="text-xs text-muted-foreground">
        Esta lista mostra apenas depósitos ativos. Um depósito inativado não pode ser reativado por aqui hoje — a API não
        oferece esse recurso ainda.
      </p>

      <CreateWarehouseDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <EditWarehouseDialog warehouse={editingWarehouse} onClose={() => setEditingWarehouse(null)} />
    </div>
  );
}

const createWarehouseSchema = z.object({
  code: z.string().trim().min(1, 'Informe o código.').max(20, 'Máximo de 20 caracteres.'),
  name: z.string().trim().min(1, 'Informe o nome.').max(120, 'Máximo de 120 caracteres.'),
  description: z.string().trim().max(500).optional(),
});

type CreateWarehouseFormData = z.infer<typeof createWarehouseSchema>;

function CreateWarehouseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateWarehouseFormData>({
    resolver: zodResolver(createWarehouseSchema),
    defaultValues: { code: '', name: '', description: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateWarehouseFormData) =>
      warehousesApi.createWarehouse({
        code: values.code.trim(),
        name: values.name.trim(),
        description: values.description?.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      reset();
      setFormError(null);
      onClose();
    },
    onError: (error) => {
      const isConflict = axios.isAxiosError(error) && error.response?.status === 409;
      const didacticError = translateApiError(error, 'Não foi possível criar o depósito');
      setFormError(
        isConflict ? { ...didacticError, reasons: ['Já existe um depósito com esse código.'] } : didacticError,
      );
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({ code: '', name: '', description: '' });
      setFormError(null);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo depósito</DialogTitle>
          <DialogDescription>O código é definitivo após a criação — não poderá ser alterado depois.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="warehouse-code">Código *</Label>
            <Input id="warehouse-code" placeholder="EX.: INSUMOS" {...register('code')} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="warehouse-name">Nome *</Label>
            <Input id="warehouse-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="warehouse-description">Descrição</Label>
            <Input id="warehouse-description" {...register('description')} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Criar depósito'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const editWarehouseSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.').max(120, 'Máximo de 120 caracteres.'),
  description: z.string().trim().max(500).optional(),
  active: z.boolean(),
});

type EditWarehouseFormData = z.infer<typeof editWarehouseSchema>;

function EditWarehouseDialog({
  warehouse,
  onClose,
}: {
  warehouse: warehousesApi.Warehouse | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditWarehouseFormData>({
    resolver: zodResolver(editWarehouseSchema),
    defaultValues: { name: '', description: '', active: true },
  });

  const mutation = useMutation({
    mutationFn: (values: EditWarehouseFormData) =>
      warehousesApi.updateWarehouse(warehouse!.id, {
        name: values.name.trim(),
        description: values.description?.trim() || null,
        active: values.active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível salvar o depósito')),
  });

  React.useEffect(() => {
    if (warehouse) {
      reset({ name: warehouse.name, description: warehouse.description ?? '', active: warehouse.active });
      setFormError(null);
    }
  }, [warehouse, reset]);

  return (
    <Dialog open={Boolean(warehouse)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar depósito {warehouse?.code}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-warehouse-code">Código</Label>
            <Input id="edit-warehouse-code" value={warehouse?.code ?? ''} disabled readOnly />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-warehouse-name">Nome *</Label>
            <Input id="edit-warehouse-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-warehouse-description">Descrição</Label>
            <Input id="edit-warehouse-description" {...register('description')} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          <div className="flex items-center gap-2">
            <input id="edit-warehouse-active" type="checkbox" className="size-4" {...register('active')} />
            <Label htmlFor="edit-warehouse-active">Depósito ativo</Label>
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
