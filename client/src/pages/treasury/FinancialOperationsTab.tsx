import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';

import * as treasuryApi from '@/api/treasury';
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

const TYPE_LABELS: Record<treasuryApi.OperationType, string> = {
  loan: 'Empréstimo',
  investment: 'Aplicação',
  financing: 'Financiamento',
  leasing: 'Leasing',
};

const GUARANTEE_LABELS: Record<treasuryApi.GuaranteeType, string> = {
  aval: 'Aval',
  fianca: 'Fiança',
  alienacao: 'Alienação fiduciária',
  recebiveis: 'Recebíveis',
  none: 'Sem garantia',
};

const STATUS_LABELS: Record<treasuryApi.OperationStatus, { label: string; variant: 'success' | 'secondary' | 'destructive' }> = {
  active: { label: 'Ativa', variant: 'success' },
  settled: { label: 'Liquidada', variant: 'secondary' },
  canceled: { label: 'Cancelada', variant: 'destructive' },
};

function formatCurrency(value: string | number) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Aba "Operações Financeiras" de `/treasury` — empréstimos, aplicações, financiamentos e leasing. */
export function FinancialOperationsTab() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'financial');
  const canApprove = hasRole('admin', 'financial');
  const [statusFilter, setStatusFilter] = React.useState<treasuryApi.OperationStatus | ''>('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingOperation, setEditingOperation] = React.useState<treasuryApi.TreasuryFinancialOperation | null>(null);

  const queryClient = useQueryClient();
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['treasury-operations', statusFilter],
    queryFn: () => treasuryApi.listOperations({ status: statusFilter || undefined }),
  });

  const rows = data?.data ?? [];

  const settleMutation = useMutation({
    mutationFn: (id: number) => treasuryApi.settleOperation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury-operations'] });
      setActionError(null);
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível liquidar a operação')),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => treasuryApi.cancelOperation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury-operations'] });
      setActionError(null);
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível cancelar a operação')),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="operation-status-filter" className="text-sm text-muted-foreground">
            Status
          </Label>
          <SelectNative
            id="operation-status-filter"
            className="max-w-56"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as treasuryApi.OperationStatus | '')}
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_LABELS).map(([value, meta]) => (
              <option key={value} value={value}>{meta.label}</option>
            ))}
          </SelectNative>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nova operação financeira
          </Button>
        )}
      </div>

      {actionError && <DidacticAlert error={actionError} />}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Contrato</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Instituição</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Taxa (%)</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>Fim</TableHead>
            <TableHead>Garantia</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={10} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={10} className="text-center text-destructive">
                Não foi possível carregar as operações financeiras. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {rows.map((operation) => (
            <TableRow key={operation.id}>
              <TableCell className="font-mono text-xs">{operation.contract_number}</TableCell>
              <TableCell className="text-xs">{TYPE_LABELS[operation.operation_type]}</TableCell>
              <TableCell>{operation.institution}</TableCell>
              <TableCell>{formatCurrency(operation.amount)}</TableCell>
              <TableCell className="text-xs">{operation.interest_rate != null ? `${operation.interest_rate}%` : '—'}</TableCell>
              <TableCell className="text-xs">{operation.start_date}</TableCell>
              <TableCell className="text-xs">{operation.end_date || '—'}</TableCell>
              <TableCell className="text-xs">{GUARANTEE_LABELS[operation.guarantee_type]}</TableCell>
              <TableCell>
                <Badge variant={STATUS_LABELS[operation.status].variant}>{STATUS_LABELS[operation.status].label}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {canWrite && operation.status === 'active' && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingOperation(operation)}>
                      Editar
                    </Button>
                  )}
                  {canApprove && operation.status === 'active' && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={settleMutation.isPending}
                        onClick={() => settleMutation.mutate(operation.id)}
                      >
                        Liquidar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={cancelMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Cancelar a operação financeira "${operation.contract_number}"?`)) {
                            cancelMutation.mutate(operation.id);
                          }
                        }}
                      >
                        Cancelar
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="text-center text-muted-foreground">
                Nenhuma operação financeira encontrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <OperationDialog mode="create" open={createOpen} operation={null} onClose={() => setCreateOpen(false)} />
      <OperationDialog mode="edit" open={Boolean(editingOperation)} operation={editingOperation} onClose={() => setEditingOperation(null)} />
    </div>
  );
}

const operationSchema = z.object({
  operation_type: z.enum(['loan', 'investment', 'financing', 'leasing']),
  institution: z.string().trim().min(1, 'Instituição é obrigatória'),
  contract_number: z.string().trim().min(1, 'Número do contrato é obrigatório'),
  amount: z.coerce.number().positive('Valor deve ser maior que zero'),
  interest_rate: z.coerce.number().min(0).optional(),
  start_date: z.string().min(1, 'Data de início é obrigatória'),
  end_date: z.string().optional(),
  guarantee_type: z.enum(['aval', 'fianca', 'alienacao', 'recebiveis', 'none']),
  notes: z.string().trim().optional(),
});

const updateOperationSchema = operationSchema.omit({ contract_number: true }).partial().extend({
  contract_number: z.string().trim().min(1).optional(),
});

type OperationFormData = z.infer<typeof operationSchema>;

function OperationDialog({
  mode,
  open,
  operation,
  onClose,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  operation: treasuryApi.TreasuryFinancialOperation | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OperationFormData>({
    resolver: zodResolver(mode === 'create' ? operationSchema : (updateOperationSchema as typeof operationSchema)),
    defaultValues: {
      operation_type: 'loan', institution: '', contract_number: '', amount: 0,
      interest_rate: 0, start_date: '', end_date: '', guarantee_type: 'none', notes: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: OperationFormData) =>
      mode === 'create'
        ? treasuryApi.createOperation(values as treasuryApi.CreateOperationInput)
        : treasuryApi.updateOperation(operation!.id, values as treasuryApi.UpdateOperationInput),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury-operations'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível salvar a operação financeira')),
  });

  React.useEffect(() => {
    if (open) {
      if (mode === 'edit' && operation) {
        reset({
          operation_type: operation.operation_type,
          institution: operation.institution,
          contract_number: operation.contract_number,
          amount: Number(operation.amount),
          interest_rate: operation.interest_rate != null ? Number(operation.interest_rate) : 0,
          start_date: operation.start_date,
          end_date: operation.end_date ?? '',
          guarantee_type: operation.guarantee_type,
          notes: operation.notes ?? '',
        });
      } else {
        reset({ operation_type: 'loan', institution: '', contract_number: '', amount: 0, interest_rate: 0, start_date: '', end_date: '', guarantee_type: 'none', notes: '' });
      }
      setFormError(null);
    }
  }, [open, mode, operation, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nova operação financeira' : `Editar operação — ${operation?.contract_number ?? ''}`}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="op-type">Tipo *</Label>
              <SelectNative id="op-type" {...register('operation_type')}>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="op-contract-number">Nº do contrato *</Label>
              <Input id="op-contract-number" {...register('contract_number')} />
              {errors.contract_number && <p className="text-sm text-destructive">{errors.contract_number.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="op-institution">Instituição financeira *</Label>
            <Input id="op-institution" {...register('institution')} />
            {errors.institution && <p className="text-sm text-destructive">{errors.institution.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="op-amount">Valor (R$) *</Label>
              <Input id="op-amount" type="number" step="0.01" {...register('amount')} />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="op-interest-rate">Taxa de juros (%)</Label>
              <Input id="op-interest-rate" type="number" step="0.01" {...register('interest_rate')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="op-start-date">Data de início *</Label>
              <Input id="op-start-date" type="date" {...register('start_date')} />
              {errors.start_date && <p className="text-sm text-destructive">{errors.start_date.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="op-end-date">Data de fim</Label>
              <Input id="op-end-date" type="date" {...register('end_date')} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="op-guarantee-type">Garantia</Label>
            <SelectNative id="op-guarantee-type" {...register('guarantee_type')}>
              {Object.entries(GUARANTEE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="op-notes">Observações</Label>
            <textarea
              id="op-notes"
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
              {mutation.isPending ? 'Salvando...' : mode === 'create' ? 'Criar operação' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
