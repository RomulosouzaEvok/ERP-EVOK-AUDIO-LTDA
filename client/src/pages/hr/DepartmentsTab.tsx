import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';

import * as departmentsApi from '@/api/departments';
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
 * Aba "Departamentos" de `/hr` — CRUD simples (sem paginação, o backend
 * (`GET /api/departments`) sempre retorna a lista inteira de departamentos
 * ativos). Criação/edição/inativação exigem role `admin` — o backend usa
 * `authorize('admin')` puro (não é um módulo de `access-profiles`), então o
 * gate de UI aqui replica exatamente essa regra via `hasRole('admin')`.
 *
 * Limitação conhecida (mesmo padrão de `WarehousesPage.tsx`): a API não
 * expõe forma de reativar um departamento inativado por aqui.
 */
export function DepartmentsTab() {
  const { hasRole } = useAuth();
  const canManage = hasRole('admin');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingDepartment, setEditingDepartment] = React.useState<departmentsApi.Department | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsApi.listDepartments,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        {canManage && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus /> Novo departamento
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Sigla</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Situação</TableHead>
            {canManage && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={canManage ? 6 : 5} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={canManage ? 6 : 5} className="text-center text-destructive">
                Não foi possível carregar os departamentos. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.map((department) => (
            <TableRow key={department.id}>
              <TableCell className="font-mono text-xs">{department.code}</TableCell>
              <TableCell className="font-mono text-xs">{department.sigla}</TableCell>
              <TableCell>{department.name}</TableCell>
              <TableCell className="max-w-96 truncate text-muted-foreground" title={department.description ?? undefined}>
                {department.description || '-'}
              </TableCell>
              <TableCell>
                <Badge variant={department.active ? 'success' : 'secondary'}>
                  {department.active ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              {canManage && (
                <TableCell className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingDepartment(department)}>
                    Editar
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.length === 0 && (
            <TableRow>
              <TableCell colSpan={canManage ? 6 : 5} className="text-center text-muted-foreground">
                Nenhum departamento cadastrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <p className="text-xs text-muted-foreground">
        Esta lista mostra apenas departamentos ativos. Um departamento inativado não pode ser reativado por aqui hoje — a
        API não oferece esse recurso ainda.
      </p>

      <CreateDepartmentDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <EditDepartmentDialog department={editingDepartment} onClose={() => setEditingDepartment(null)} />
    </div>
  );
}

const createDepartmentSchema = z.object({
  code: z.string().trim().min(1, 'Informe o código.').max(10, 'Máximo de 10 caracteres.'),
  sigla: z.string().trim().min(1, 'Informe a sigla.').max(10, 'Máximo de 10 caracteres.'),
  name: z.string().trim().min(1, 'Informe o nome.').max(100, 'Máximo de 100 caracteres.'),
  description: z.string().trim().max(500).optional(),
});

type CreateDepartmentFormData = z.infer<typeof createDepartmentSchema>;

function CreateDepartmentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateDepartmentFormData>({
    resolver: zodResolver(createDepartmentSchema),
    defaultValues: { code: '', sigla: '', name: '', description: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateDepartmentFormData) =>
      departmentsApi.createDepartment({
        code: values.code.trim(),
        sigla: values.sigla.trim(),
        name: values.name.trim(),
        description: values.description?.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      reset();
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível criar o departamento')),
  });

  React.useEffect(() => {
    if (open) {
      reset({ code: '', sigla: '', name: '', description: '' });
      setFormError(null);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo departamento</DialogTitle>
          <DialogDescription>Código e sigla devem ser únicos na organização.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dept-code">Código *</Label>
              <Input id="dept-code" placeholder="EX.: 010" {...register('code')} />
              {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dept-sigla">Sigla *</Label>
              <Input id="dept-sigla" placeholder="EX.: RH" {...register('sigla')} />
              {errors.sigla && <p className="text-sm text-destructive">{errors.sigla.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dept-name">Nome *</Label>
            <Input id="dept-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dept-description">Descrição</Label>
            <Input id="dept-description" {...register('description')} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Criar departamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const editDepartmentSchema = z.object({
  code: z.string().trim().min(1, 'Informe o código.').max(10, 'Máximo de 10 caracteres.'),
  sigla: z.string().trim().min(1, 'Informe a sigla.').max(10, 'Máximo de 10 caracteres.'),
  name: z.string().trim().min(1, 'Informe o nome.').max(100, 'Máximo de 100 caracteres.'),
  description: z.string().trim().max(500).optional(),
  active: z.boolean(),
});

type EditDepartmentFormData = z.infer<typeof editDepartmentSchema>;

function EditDepartmentDialog({
  department,
  onClose,
}: {
  department: departmentsApi.Department | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditDepartmentFormData>({
    resolver: zodResolver(editDepartmentSchema),
    defaultValues: { code: '', sigla: '', name: '', description: '', active: true },
  });

  const mutation = useMutation({
    mutationFn: (values: EditDepartmentFormData) =>
      departmentsApi.updateDepartment(department!.id, {
        code: values.code.trim(),
        sigla: values.sigla.trim(),
        name: values.name.trim(),
        description: values.description?.trim() || null,
        active: values.active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível salvar o departamento')),
  });

  React.useEffect(() => {
    if (department) {
      reset({
        code: department.code,
        sigla: department.sigla,
        name: department.name,
        description: department.description ?? '',
        active: department.active,
      });
      setFormError(null);
    }
  }, [department, reset]);

  return (
    <Dialog open={Boolean(department)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar departamento {department?.name}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-dept-code">Código *</Label>
              <Input id="edit-dept-code" {...register('code')} />
              {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-dept-sigla">Sigla *</Label>
              <Input id="edit-dept-sigla" {...register('sigla')} />
              {errors.sigla && <p className="text-sm text-destructive">{errors.sigla.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-dept-name">Nome *</Label>
            <Input id="edit-dept-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-dept-description">Descrição</Label>
            <Input id="edit-dept-description" {...register('description')} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          <div className="flex items-center gap-2">
            <input id="edit-dept-active" type="checkbox" className="size-4" {...register('active')} />
            <Label htmlFor="edit-dept-active">Departamento ativo</Label>
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
