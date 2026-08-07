import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';

import * as budgetApi from '@/api/budget';
import { listCostCenters } from '@/api/financial';
import { useAuth } from '@/context/AuthContext';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const CATEGORY_LABELS: Record<budgetApi.BudgetCategory, string> = {
  custo_fixo: 'Custo fixo',
  custo_variavel: 'Custo variável',
  investimento: 'Investimento',
  outro: 'Outro',
};

const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatCurrency(value: string | number) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const CURRENT_YEAR = new Date().getFullYear();

/** Aba "Linhas de Orçamento" de `/budget` — CRUD completo (inclui DELETE físico, planejamento não é histórico imutável). */
export function BudgetLinesTab() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'financial');
  const [yearFilter, setYearFilter] = React.useState<number>(CURRENT_YEAR);
  const [costCenterFilter, setCostCenterFilter] = React.useState<number | ''>('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingLine, setEditingLine] = React.useState<budgetApi.BudgetLine | null>(null);

  const queryClient = useQueryClient();
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['budget-lines', yearFilter, costCenterFilter],
    queryFn: () => budgetApi.listBudgetLines({ year: yearFilter, cost_center_id: costCenterFilter || undefined }),
  });

  const { data: costCentersData } = useQuery({
    queryKey: ['cost-centers-for-budget'],
    queryFn: () => listCostCenters({ active: true }),
  });
  const costCenters = costCentersData?.data ?? [];

  const rows = data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => budgetApi.deleteBudgetLine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-lines'] });
      setActionError(null);
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível excluir a linha de orçamento')),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget-year-filter" className="text-sm text-muted-foreground">
              Ano
            </Label>
            <Input
              id="budget-year-filter"
              type="number"
              className="w-28"
              value={yearFilter}
              onChange={(event) => setYearFilter(Number(event.target.value) || CURRENT_YEAR)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget-cost-center-filter" className="text-sm text-muted-foreground">
              Centro de custo
            </Label>
            <SelectNative
              id="budget-cost-center-filter"
              className="max-w-64"
              value={costCenterFilter}
              onChange={(event) => setCostCenterFilter(event.target.value ? Number(event.target.value) : '')}
            >
              <option value="">Todos</option>
              {costCenters.map((cc) => (
                <option key={cc.id} value={cc.id}>{cc.code} — {cc.name}</option>
              ))}
            </SelectNative>
          </div>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nova linha de orçamento
          </Button>
        )}
      </div>

      {actionError && <DidacticAlert error={actionError} />}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Centro de custo</TableHead>
            <TableHead>Ano</TableHead>
            <TableHead>Mês</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Valor orçado</TableHead>
            <TableHead>Observações</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={canWrite ? 7 : 6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={canWrite ? 7 : 6} className="text-center text-destructive">
                Não foi possível carregar as linhas de orçamento. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {rows.map((line) => (
            <TableRow key={line.id}>
              <TableCell>{line.costCenter ? `${line.costCenter.code} — ${line.costCenter.name}` : `#${line.cost_center_id}`}</TableCell>
              <TableCell>{line.year}</TableCell>
              <TableCell>
                {line.month ? (
                  MONTH_LABELS[line.month - 1]
                ) : (
                  <Badge variant="secondary">Anual</Badge>
                )}
              </TableCell>
              <TableCell className="text-xs">{CATEGORY_LABELS[line.category]}</TableCell>
              <TableCell>{formatCurrency(line.planned_amount)}</TableCell>
              <TableCell className="max-w-64 truncate text-xs text-muted-foreground" title={line.notes ?? ''}>{line.notes || '—'}</TableCell>
              {canWrite && (
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingLine(line)}>
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (window.confirm('Excluir esta linha de orçamento? Esta ação não pode ser desfeita.')) {
                          deleteMutation.mutate(line.id);
                        }
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={canWrite ? 7 : 6} className="text-center text-muted-foreground">
                Nenhuma linha de orçamento cadastrada para este período.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <BudgetLineDialog mode="create" open={createOpen} line={null} costCenters={costCenters} onClose={() => setCreateOpen(false)} />
      <BudgetLineDialog mode="edit" open={Boolean(editingLine)} line={editingLine} costCenters={costCenters} onClose={() => setEditingLine(null)} />
    </div>
  );
}

const budgetLineSchema = z.object({
  cost_center_id: z.coerce.number().int().positive('Centro de custo é obrigatório'),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.union([z.literal(''), z.coerce.number().int().min(1).max(12)]).optional(),
  category: z.enum(['custo_fixo', 'custo_variavel', 'investimento', 'outro']),
  planned_amount: z.coerce.number().nonnegative('Valor não pode ser negativo'),
  notes: z.string().trim().optional(),
});

type BudgetLineFormData = z.infer<typeof budgetLineSchema>;

function BudgetLineDialog({
  mode,
  open,
  line,
  costCenters,
  onClose,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  line: budgetApi.BudgetLine | null;
  costCenters: Array<{ id: number; code: string; name: string }>;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BudgetLineFormData>({
    resolver: zodResolver(budgetLineSchema),
    defaultValues: {
      cost_center_id: undefined, year: CURRENT_YEAR, month: '', category: 'outro', planned_amount: 0, notes: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: BudgetLineFormData) => {
      const payload = {
        cost_center_id: values.cost_center_id,
        year: values.year,
        month: values.month === '' || values.month === undefined ? null : values.month,
        category: values.category,
        planned_amount: values.planned_amount,
        notes: values.notes || null,
      };
      return mode === 'create'
        ? budgetApi.createBudgetLine(payload)
        : budgetApi.updateBudgetLine(line!.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-lines'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível salvar a linha de orçamento')),
  });

  React.useEffect(() => {
    if (open) {
      if (mode === 'edit' && line) {
        reset({
          cost_center_id: line.cost_center_id,
          year: line.year,
          month: line.month ?? '',
          category: line.category,
          planned_amount: Number(line.planned_amount),
          notes: line.notes ?? '',
        });
      } else {
        reset({ cost_center_id: undefined, year: CURRENT_YEAR, month: '', category: 'outro', planned_amount: 0, notes: '' });
      }
      setFormError(null);
    }
  }, [open, mode, line, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nova linha de orçamento' : `Editar linha de orçamento #${line?.id ?? ''}`}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget-cost-center">Centro de custo *</Label>
            <SelectNative id="budget-cost-center" {...register('cost_center_id')}>
              <option value="">Selecione...</option>
              {costCenters.map((cc) => (
                <option key={cc.id} value={cc.id}>{cc.code} — {cc.name}</option>
              ))}
            </SelectNative>
            {errors.cost_center_id && <p className="text-sm text-destructive">{errors.cost_center_id.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="budget-year">Ano *</Label>
              <Input id="budget-year" type="number" {...register('year')} />
              {errors.year && <p className="text-sm text-destructive">{errors.year.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="budget-month">Mês (vazio = anual)</Label>
              <SelectNative id="budget-month" {...register('month')}>
                <option value="">Anual (sem mês)</option>
                {MONTH_LABELS.map((label, index) => (
                  <option key={label} value={index + 1}>{label}</option>
                ))}
              </SelectNative>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="budget-category">Categoria *</Label>
              <SelectNative id="budget-category" {...register('category')}>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="budget-planned-amount">Valor orçado (R$) *</Label>
              <Input id="budget-planned-amount" type="number" step="0.01" {...register('planned_amount')} />
              {errors.planned_amount && <p className="text-sm text-destructive">{errors.planned_amount.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget-notes">Observações</Label>
            <textarea
              id="budget-notes"
              rows={2}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-brand"
              {...register('notes')}
            />
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : mode === 'create' ? 'Criar linha' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
