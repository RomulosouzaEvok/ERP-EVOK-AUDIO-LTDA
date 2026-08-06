import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';

import * as financialApi from '@/api/financial';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { DidacticAlert } from '@/components/DidacticAlert';

function formatBRL(value: number): string {
  return `R$ ${Number(value ?? 0).toFixed(2)}`;
}

function firstDayOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Aba "Centros de Custo" de `/financial` — CRUD (código, nome, descrição,
 * ativo/inativo) e relatório de contas a pagar/receber (aberto e realizado)
 * agrupado por centro de custo, com o grupo "Sem centro de custo" sempre
 * visível.
 */
export function CostCentersTab() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingCostCenter, setEditingCostCenter] = React.useState<financialApi.CostCenter | null>(null);
  const [from, setFrom] = React.useState(firstDayOfMonth());
  const [to, setTo] = React.useState(today());

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cost-centers'],
    queryFn: () => financialApi.listCostCenters({ limit: 100 }),
  });

  const { data: report, isLoading: loadingReport, isError: errorReport } = useQuery({
    queryKey: ['cost-centers-report', from, to],
    queryFn: () => financialApi.getCostCenterReport({ from, to }),
    enabled: Boolean(from && to),
  });

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-l-4 border-l-brand/40">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Centros de Custo</CardTitle>
          {canWrite && (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus /> Novo centro de custo
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Situação</TableHead>
                {canWrite && <TableHead>Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableSkeletonRows columns={canWrite ? 5 : 4} />}
              {isError && (
                <TableRow>
                  <TableCell colSpan={canWrite ? 5 : 4} className="text-center text-destructive">
                    Não foi possível carregar os centros de custo. Tente novamente.
                  </TableCell>
                </TableRow>
              )}
              {data?.data.map((costCenter) => (
                <TableRow key={costCenter.id}>
                  <TableCell className="font-mono text-xs">{costCenter.code}</TableCell>
                  <TableCell>{costCenter.name}</TableCell>
                  <TableCell className="max-w-96 truncate text-muted-foreground" title={costCenter.description ?? undefined}>
                    {costCenter.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={costCenter.active ? 'success' : 'secondary'}>
                      {costCenter.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setEditingCostCenter(costCenter)}>
                        Editar
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {!isLoading && !isError && data?.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canWrite ? 5 : 4} className="text-center text-muted-foreground">
                    Nenhum centro de custo cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-brand/40">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Relatório por centro de custo</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="cc-report-from" className="text-xs text-muted-foreground">
                De
              </Label>
              <Input id="cc-report-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-8 w-36" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="cc-report-to" className="text-xs text-muted-foreground">
                Até
              </Label>
              <Input id="cc-report-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-8 w-36" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingReport && <p className="text-sm text-muted-foreground">Carregando relatório...</p>}
          {errorReport && <p className="text-sm text-destructive">Não foi possível carregar o relatório. Tente novamente.</p>}
          {!loadingReport && !errorReport && report && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Centro de custo</TableHead>
                  <TableHead className="text-right">A receber (aberto)</TableHead>
                  <TableHead className="text-right">A receber (realizado)</TableHead>
                  <TableHead className="text-right">A pagar (aberto)</TableHead>
                  <TableHead className="text-right">A pagar (realizado)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.groups.map((group) => (
                  <TableRow key={group.cost_center_id ?? 'none'}>
                    <TableCell>
                      {group.code ? <span className="font-mono text-xs text-muted-foreground">{group.code}</span> : null}{' '}
                      {group.cost_center_id === null ? <span className="italic text-muted-foreground">{group.name}</span> : group.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700">{formatBRL(group.receivable.open)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{formatBRL(group.receivable.realized)}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">{formatBRL(group.payable.open)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{formatBRL(group.payable.realized)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-700">{formatBRL(report.totals.receivable.open)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(report.totals.receivable.realized)}</TableCell>
                  <TableCell className="text-right tabular-nums text-destructive">{formatBRL(report.totals.payable.open)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(report.totals.payable.realized)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateCostCenterDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <EditCostCenterDialog costCenter={editingCostCenter} onClose={() => setEditingCostCenter(null)} />
    </div>
  );
}

const createCostCenterSchema = z.object({
  code: z.string().trim().min(1, 'Informe o código.').max(30, 'Máximo de 30 caracteres.'),
  name: z.string().trim().min(1, 'Informe o nome.').max(100, 'Máximo de 100 caracteres.'),
  description: z.string().trim().max(2000).optional(),
});

type CreateCostCenterFormData = z.infer<typeof createCostCenterSchema>;

function CreateCostCenterDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCostCenterFormData>({
    resolver: zodResolver(createCostCenterSchema),
    defaultValues: { code: '', name: '', description: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateCostCenterFormData) =>
      financialApi.createCostCenter({
        code: values.code.trim(),
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] });
      reset();
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível criar o centro de custo')),
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
          <DialogTitle>Novo centro de custo</DialogTitle>
          <DialogDescription>O código deve ser único.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cc-code">Código *</Label>
            <Input id="cc-code" placeholder="EX.: PRODUCAO" {...register('code')} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cc-name">Nome *</Label>
            <Input id="cc-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cc-description">Descrição</Label>
            <Input id="cc-description" {...register('description')} />
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Criar centro de custo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const editCostCenterSchema = z.object({
  code: z.string().trim().min(1, 'Informe o código.').max(30, 'Máximo de 30 caracteres.'),
  name: z.string().trim().min(1, 'Informe o nome.').max(100, 'Máximo de 100 caracteres.'),
  description: z.string().trim().max(2000).optional(),
  active: z.boolean(),
});

type EditCostCenterFormData = z.infer<typeof editCostCenterSchema>;

function EditCostCenterDialog({
  costCenter,
  onClose,
}: {
  costCenter: financialApi.CostCenter | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditCostCenterFormData>({
    resolver: zodResolver(editCostCenterSchema),
    defaultValues: { code: '', name: '', description: '', active: true },
  });

  const mutation = useMutation({
    mutationFn: (values: EditCostCenterFormData) =>
      financialApi.updateCostCenter(costCenter!.id, {
        code: values.code.trim(),
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        active: values.active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] });
      queryClient.invalidateQueries({ queryKey: ['cost-centers-report'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível salvar o centro de custo')),
  });

  React.useEffect(() => {
    if (costCenter) {
      reset({
        code: costCenter.code,
        name: costCenter.name,
        description: costCenter.description ?? '',
        active: costCenter.active,
      });
      setFormError(null);
    }
  }, [costCenter, reset]);

  return (
    <Dialog open={Boolean(costCenter)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar centro de custo {costCenter?.name}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-cc-code">Código *</Label>
            <Input id="edit-cc-code" {...register('code')} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-cc-name">Nome *</Label>
            <Input id="edit-cc-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-cc-description">Descrição</Label>
            <Input id="edit-cc-description" {...register('description')} />
          </div>
          <div className="flex items-center gap-2">
            <input id="edit-cc-active" type="checkbox" className="size-4" {...register('active')} />
            <Label htmlFor="edit-cc-active">Centro de custo ativo</Label>
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
