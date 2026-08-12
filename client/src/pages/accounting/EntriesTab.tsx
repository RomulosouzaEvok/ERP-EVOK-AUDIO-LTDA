import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Plus, RotateCcw, Trash2 } from 'lucide-react';

import * as accountingApi from '@/api/accounting';
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
import { formatCurrency as formatMoney } from '@/lib/format';

const TYPE_LABELS: Record<accountingApi.EntryType, string> = {
  receipt: 'Recebimento',
  payment: 'Pagamento',
  sales: 'Venda',
  purchase: 'Compra',
  payroll: 'Folha de pagamento',
  depreciation: 'Depreciação',
  closing: 'Fechamento',
  adjustment: 'Ajuste/Estorno',
};

const STATUS_LABELS: Record<accountingApi.EntryStatus, string> = {
  draft: 'Rascunho',
  posted: 'Contabilizado',
  reversed: 'Estornado',
};

const STATUS_VARIANT: Record<accountingApi.EntryStatus, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  draft: 'warning',
  posted: 'success',
  reversed: 'destructive',
};


/** Aba "Lançamentos" de `/accounting` — lista + criação/edição de rascunho com múltiplas linhas débito/crédito, postar e estornar. */
export function EntriesTab() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'financial');
  const [statusFilter, setStatusFilter] = React.useState<accountingApi.EntryStatus | ''>('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingEntry, setEditingEntry] = React.useState<accountingApi.AccountingEntry | null>(null);
  const [detailEntry, setDetailEntry] = React.useState<accountingApi.AccountingEntry | null>(null);
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['accounting-entries', statusFilter],
    queryFn: () => accountingApi.listEntries({ status: statusFilter || undefined, limit: 100 }),
  });

  const { data: accountsData } = useQuery({
    queryKey: ['accounting-accounts', 'leaf'],
    queryFn: () => accountingApi.listAccounts({ active: true }),
  });
  const leafAccounts = React.useMemo(() => (accountsData?.data ?? []).filter((a) => a.accept_entries), [accountsData?.data]);

  const postMutation = useMutation({
    mutationFn: (id: number) => accountingApi.postEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-entries'] });
      setActionError(null);
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível postar o lançamento')),
  });

  const reverseMutation = useMutation({
    mutationFn: (id: number) => accountingApi.reverseEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-entries'] });
      setActionError(null);
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível estornar o lançamento')),
  });

  return (
    <div className="flex flex-col gap-4">
      {actionError && <DidacticAlert error={actionError} />}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="entry-status-filter" className="text-sm text-muted-foreground">
            Status
          </Label>
          <SelectNative
            id="entry-status-filter"
            className="max-w-48"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as accountingApi.EntryStatus | '')}
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SelectNative>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Novo lançamento
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-destructive">
                Não foi possível carregar os lançamentos. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="font-mono text-xs">{entry.entry_number}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{entry.entry_date}</TableCell>
              <TableCell>{entry.description}</TableCell>
              <TableCell className="text-xs">{TYPE_LABELS[entry.entry_type]}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[entry.status]}>{STATUS_LABELS[entry.status]}</Badge>
              </TableCell>
              <TableCell className="flex flex-wrap gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setDetailEntry(entry)}>
                  Ver
                </Button>
                {canWrite && entry.status === 'draft' && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditingEntry(entry)}>
                    Editar
                  </Button>
                )}
                {canWrite && entry.status === 'draft' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={postMutation.isPending}
                    onClick={() => postMutation.mutate(entry.id)}
                  >
                    <CheckCircle2 className="size-4" />
                    Postar
                  </Button>
                )}
                {canWrite && entry.status === 'posted' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={reverseMutation.isPending}
                    onClick={() => {
                      if (window.confirm(`Estornar o lançamento ${entry.entry_number}? Isso criará um novo lançamento com débito/crédito invertidos.`)) {
                        reverseMutation.mutate(entry.id);
                      }
                    }}
                  >
                    <RotateCcw className="size-4" />
                    Estornar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhum lançamento encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <EntryDialog mode="create" open={createOpen} entry={null} accounts={leafAccounts} onClose={() => setCreateOpen(false)} />
      <EntryDialog mode="edit" open={Boolean(editingEntry)} entry={editingEntry} accounts={leafAccounts} onClose={() => setEditingEntry(null)} />
      <EntryDetailDialog entry={detailEntry} onClose={() => setDetailEntry(null)} />
    </div>
  );
}

function EntryDetailDialog({ entry, onClose }: { entry: accountingApi.AccountingEntry | null; onClose: () => void }) {
  if (!entry) return null;

  const totalDebit = (entry.items ?? []).reduce((sum, item) => sum + Number(item.debit), 0);
  const totalCredit = (entry.items ?? []).reduce((sum, item) => sum + Number(item.credit), 0);

  return (
    <Dialog open={Boolean(entry)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Lançamento {entry.entry_number} — <Badge variant={STATUS_VARIANT[entry.status]}>{STATUS_LABELS[entry.status]}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{entry.description}</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conta</TableHead>
                <TableHead>Histórico</TableHead>
                <TableHead className="text-right">Débito</TableHead>
                <TableHead className="text-right">Crédito</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(entry.items ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs">{item.account ? `${item.account.code} — ${item.account.name}` : item.account_id}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.historical ?? '—'}</TableCell>
                  <TableCell className="text-right text-xs">{Number(item.debit) > 0 ? formatMoney(item.debit) : '—'}</TableCell>
                  <TableCell className="text-right text-xs">{Number(item.credit) > 0 ? formatMoney(item.credit) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end gap-6 text-sm font-medium">
            <span>Total débito: {formatMoney(totalDebit)}</span>
            <span>Total crédito: {formatMoney(totalCredit)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const entryItemSchema = z.object({
  account_id: z.coerce.number().int().positive('Selecione uma conta.'),
  debit: z.coerce.number().min(0).optional(),
  credit: z.coerce.number().min(0).optional(),
  historical: z.string().trim().optional(),
});

const entrySchema = z.object({
  entry_date: z.string().trim().min(1, 'Data é obrigatória'),
  description: z.string().trim().min(1, 'Descrição é obrigatória'),
  entry_type: z.enum(['receipt', 'payment', 'sales', 'purchase', 'payroll', 'depreciation', 'closing', 'adjustment']),
  items: z.array(entryItemSchema).min(1, 'Adicione ao menos um item.'),
});

type EntryFormData = z.infer<typeof entrySchema>;

function EntryDialog({
  mode,
  open,
  entry,
  accounts,
  onClose,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  entry: accountingApi.AccountingEntry | null;
  accounts: accountingApi.ChartOfAccount[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      entry_date: '',
      description: '',
      entry_type: 'adjustment',
      items: [{ account_id: undefined, debit: undefined, credit: undefined } as never],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = useWatch({ control, name: 'items' });

  const { totalDebit, totalCredit, balanced } = React.useMemo(() => {
    const items = watchedItems ?? [];
    const debit = items.reduce((sum, item) => sum + (Number(item?.debit) || 0), 0);
    const credit = items.reduce((sum, item) => sum + (Number(item?.credit) || 0), 0);
    return { totalDebit: debit, totalCredit: credit, balanced: items.length >= 2 && debit > 0 && debit === credit };
  }, [watchedItems]);

  const mutation = useMutation({
    mutationFn: (values: EntryFormData) =>
      mode === 'create' ? accountingApi.createEntry(values) : accountingApi.updateEntry(entry!.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-entries'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível salvar o lançamento')),
  });

  React.useEffect(() => {
    if (open) {
      if (mode === 'edit' && entry) {
        reset({
          entry_date: entry.entry_date,
          description: entry.description,
          entry_type: entry.entry_type,
          items: (entry.items ?? []).map((item) => ({
            account_id: item.account_id,
            debit: Number(item.debit) || undefined,
            credit: Number(item.credit) || undefined,
            historical: item.historical ?? '',
          })),
        });
      } else {
        reset({ entry_date: '', description: '', entry_type: 'adjustment', items: [{ account_id: undefined, debit: undefined, credit: undefined }] as never });
      }
      setFormError(null);
    }
  }, [open, mode, entry, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo lançamento contábil' : `Editar lançamento — ${entry?.entry_number ?? ''}`}</DialogTitle>
        </DialogHeader>
        <form className="flex max-h-[75vh] flex-col gap-3 overflow-y-auto pr-1" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-date">Data *</Label>
              <Input id="entry-date" type="date" {...register('entry_date')} />
              {errors.entry_date && <p className="text-sm text-destructive">{errors.entry_date.message}</p>}
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="entry-description">Descrição *</Label>
              <Input id="entry-description" {...register('description')} />
              {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="entry-type">Tipo *</Label>
            <SelectNative id="entry-type" className="max-w-64" {...register('entry_type')}>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </SelectNative>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Itens (débito/crédito)</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2">
                <div className="flex-1">
                  <SelectNative {...register(`items.${index}.account_id`)} defaultValue="">
                    <option value="" disabled>
                      Conta...
                    </option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.code} — {account.name}
                      </option>
                    ))}
                  </SelectNative>
                </div>
                <Input type="number" step="0.01" placeholder="Débito" className="w-28" {...register(`items.${index}.debit`)} />
                <Input type="number" step="0.01" placeholder="Crédito" className="w-28" {...register(`items.${index}.credit`)} />
                <Input placeholder="Histórico" className="w-40" {...register(`items.${index}.historical`)} />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            {errors.items?.message && <p className="text-sm text-destructive">{errors.items.message}</p>}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ account_id: undefined, debit: undefined, credit: undefined, historical: '' } as never)}
            >
              <Plus className="size-3" /> Adicionar item
            </Button>
          </div>

          <div className={`flex items-center justify-between rounded-lg border p-3 text-sm ${balanced ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950' : 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950'}`}>
            <span>Total débito: <strong>{formatMoney(totalDebit)}</strong></span>
            <span>Total crédito: <strong>{formatMoney(totalCredit)}</strong></span>
            <span className={balanced ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}>
              {balanced ? 'Balanceado ✓' : 'Não fecha ainda — pode salvar como rascunho e ajustar depois'}
            </span>
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : mode === 'create' ? 'Criar rascunho' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
