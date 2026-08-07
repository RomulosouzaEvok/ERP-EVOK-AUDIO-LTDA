import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';

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

const TYPE_LABELS: Record<accountingApi.AccountType, string> = {
  asset: 'Ativo',
  liability: 'Passivo',
  equity: 'Patrimônio Líquido',
  revenue: 'Receita',
  expense: 'Despesa',
  cost: 'Custo',
};

/** Aba "Plano de Contas" de `/accounting` — árvore (indentada por nível) + CRUD sem delete físico. */
export function ChartOfAccountsTab() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'financial');
  const [typeFilter, setTypeFilter] = React.useState<accountingApi.AccountType | ''>('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<accountingApi.ChartOfAccount | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['accounting-accounts', typeFilter],
    queryFn: () => accountingApi.listAccounts({ account_type: typeFilter || undefined }),
  });

  const sortedRows = React.useMemo(
    () => [...(data?.data ?? [])].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })),
    [data?.data],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="account-type-filter" className="text-sm text-muted-foreground">
            Tipo de conta
          </Label>
          <SelectNative
            id="account-type-filter"
            className="max-w-56"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as accountingApi.AccountType | '')}
          >
            <option value="">Todos</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SelectNative>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nova conta
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Aceita lançamento</TableHead>
            <TableHead>Status</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={canWrite ? 6 : 5} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={canWrite ? 6 : 5} className="text-center text-destructive">
                Não foi possível carregar o plano de contas. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {sortedRows.map((account) => (
            <TableRow key={account.id}>
              <TableCell className="font-mono text-xs">
                <span style={{ paddingLeft: `${(account.account_level - 1) * 16}px` }}>{account.code}</span>
              </TableCell>
              <TableCell className={account.accept_entries ? '' : 'font-semibold'}>{account.name}</TableCell>
              <TableCell className="text-xs">{TYPE_LABELS[account.account_type]}</TableCell>
              <TableCell>
                <Badge variant={account.accept_entries ? 'success' : 'secondary'}>
                  {account.accept_entries ? 'Sim (folha)' : 'Não (sintética)'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={account.active ? 'success' : 'destructive'}>{account.active ? 'Ativa' : 'Inativa'}</Badge>
              </TableCell>
              {canWrite && (
                <TableCell>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditingAccount(account)}>
                    Editar
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && sortedRows.length === 0 && (
            <TableRow>
              <TableCell colSpan={canWrite ? 6 : 5} className="text-center text-muted-foreground">
                Nenhuma conta encontrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <AccountDialog mode="create" open={createOpen} account={null} onClose={() => setCreateOpen(false)} />
      <AccountDialog mode="edit" open={Boolean(editingAccount)} account={editingAccount} onClose={() => setEditingAccount(null)} />
    </div>
  );
}

const createAccountSchema = z.object({
  code: z.string().trim().min(1, 'Código é obrigatório').regex(/^\d+(\.\d+)*$/, 'Use o formato "1", "1.1", "1.1.1"'),
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  account_type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense', 'cost']),
  accept_entries: z.boolean().optional(),
  active: z.boolean().optional(),
});

const updateAccountSchema = createAccountSchema.omit({ code: true });

type CreateAccountFormData = z.infer<typeof createAccountSchema>;
type UpdateAccountFormData = z.infer<typeof updateAccountSchema>;

function AccountDialog({
  mode,
  open,
  account,
  onClose,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  account: accountingApi.ChartOfAccount | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateAccountFormData | UpdateAccountFormData>({
    resolver: zodResolver(mode === 'create' ? createAccountSchema : updateAccountSchema),
    defaultValues: { code: '', name: '', account_type: 'asset', accept_entries: true, active: true },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateAccountFormData | UpdateAccountFormData) =>
      mode === 'create'
        ? accountingApi.createAccount(values as accountingApi.CreateAccountInput)
        : accountingApi.updateAccount(account!.id, values as accountingApi.UpdateAccountInput),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-accounts'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível salvar a conta')),
  });

  React.useEffect(() => {
    if (open) {
      if (mode === 'edit' && account) {
        reset({ name: account.name, account_type: account.account_type, accept_entries: account.accept_entries, active: account.active });
      } else {
        reset({ code: '', name: '', account_type: 'asset', accept_entries: true, active: true });
      }
      setFormError(null);
    }
  }, [open, mode, account, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nova conta do plano' : `Editar conta — ${account?.code ?? ''}`}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          {mode === 'create' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-code">Código *</Label>
              <Input id="account-code" placeholder='Ex.: "1.1.5"' {...register('code' as any)} />
              {'code' in errors && errors.code && <p className="text-sm text-destructive">{(errors as any).code?.message}</p>}
              <p className="text-xs text-muted-foreground">
                O nível e a conta pai são calculados automaticamente pelos segmentos do código.
              </p>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-name">Nome *</Label>
            <Input id="account-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-type">Tipo *</Label>
            <SelectNative id="account-type" {...register('account_type')}>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </SelectNative>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('accept_entries')} />
              Aceita lançamento direto (conta folha)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('active')} />
              Ativa
            </label>
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : mode === 'create' ? 'Criar conta' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
