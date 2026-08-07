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

const TYPE_LABELS: Record<treasuryApi.BankAccountType, string> = {
  corrente: 'Corrente',
  poupanca: 'Poupança',
  aplicacao: 'Aplicação',
};

function formatCurrency(value: string | number) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Aba "Contas Bancárias" de `/treasury` — cadastro + saldo atual mantido manualmente pela Tesouraria. */
export function BankAccountsTab() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'financial');
  const [typeFilter, setTypeFilter] = React.useState<treasuryApi.BankAccountType | ''>('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<treasuryApi.TreasuryBankAccount | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['treasury-bank-accounts', typeFilter],
    queryFn: () => treasuryApi.listBankAccounts({ account_type: typeFilter || undefined }),
  });

  const rows = data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bank-account-type-filter" className="text-sm text-muted-foreground">
            Tipo de conta
          </Label>
          <SelectNative
            id="bank-account-type-filter"
            className="max-w-56"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as treasuryApi.BankAccountType | '')}
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
            Nova conta bancária
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Banco</TableHead>
            <TableHead>Agência</TableHead>
            <TableHead>Conta</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Saldo atual</TableHead>
            <TableHead>Gerente</TableHead>
            <TableHead>Status</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={canWrite ? 8 : 7} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={canWrite ? 8 : 7} className="text-center text-destructive">
                Não foi possível carregar as contas bancárias. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {rows.map((account) => (
            <TableRow key={account.id}>
              <TableCell>{account.bank_name}</TableCell>
              <TableCell className="font-mono text-xs">{account.agency}</TableCell>
              <TableCell className="font-mono text-xs">{account.account_number}</TableCell>
              <TableCell className="text-xs">{TYPE_LABELS[account.account_type]}</TableCell>
              <TableCell>{formatCurrency(account.current_balance)}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{account.manager_name || '—'}</TableCell>
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
          {!isLoading && !isError && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={canWrite ? 8 : 7} className="text-center text-muted-foreground">
                Nenhuma conta bancária cadastrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <BankAccountDialog mode="create" open={createOpen} account={null} onClose={() => setCreateOpen(false)} />
      <BankAccountDialog mode="edit" open={Boolean(editingAccount)} account={editingAccount} onClose={() => setEditingAccount(null)} />
    </div>
  );
}

const bankAccountSchema = z.object({
  bank_name: z.string().trim().min(1, 'Banco é obrigatório'),
  agency: z.string().trim().min(1, 'Agência é obrigatória'),
  account_number: z.string().trim().min(1, 'Número da conta é obrigatório'),
  account_type: z.enum(['corrente', 'poupanca', 'aplicacao']),
  current_balance: z.coerce.number().finite().optional(),
  manager_name: z.string().trim().optional(),
  manager_phone: z.string().trim().optional(),
  active: z.boolean().optional(),
});

type BankAccountFormData = z.infer<typeof bankAccountSchema>;

function BankAccountDialog({
  mode,
  open,
  account,
  onClose,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  account: treasuryApi.TreasuryBankAccount | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      bank_name: '', agency: '', account_number: '', account_type: 'corrente',
      current_balance: 0, manager_name: '', manager_phone: '', active: true,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: BankAccountFormData) =>
      mode === 'create'
        ? treasuryApi.createBankAccount(values as treasuryApi.CreateBankAccountInput)
        : treasuryApi.updateBankAccount(account!.id, values as treasuryApi.UpdateBankAccountInput),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury-bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['treasury-cash-position'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível salvar a conta bancária')),
  });

  React.useEffect(() => {
    if (open) {
      if (mode === 'edit' && account) {
        reset({
          bank_name: account.bank_name,
          agency: account.agency,
          account_number: account.account_number,
          account_type: account.account_type,
          current_balance: Number(account.current_balance),
          manager_name: account.manager_name ?? '',
          manager_phone: account.manager_phone ?? '',
          active: account.active,
        });
      } else {
        reset({ bank_name: '', agency: '', account_number: '', account_type: 'corrente', current_balance: 0, manager_name: '', manager_phone: '', active: true });
      }
      setFormError(null);
    }
  }, [open, mode, account, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nova conta bancária' : `Editar conta — ${account?.bank_name ?? ''}`}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bank-name">Banco *</Label>
            <Input id="bank-name" {...register('bank_name')} />
            {errors.bank_name && <p className="text-sm text-destructive">{errors.bank_name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bank-agency">Agência *</Label>
              <Input id="bank-agency" {...register('agency')} />
              {errors.agency && <p className="text-sm text-destructive">{errors.agency.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bank-account-number">Conta *</Label>
              <Input id="bank-account-number" {...register('account_number')} />
              {errors.account_number && <p className="text-sm text-destructive">{errors.account_number.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bank-account-type">Tipo *</Label>
              <SelectNative id="bank-account-type" {...register('account_type')}>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bank-current-balance">Saldo atual (R$)</Label>
              <Input id="bank-current-balance" type="number" step="0.01" {...register('current_balance')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bank-manager-name">Gerente</Label>
              <Input id="bank-manager-name" {...register('manager_name')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bank-manager-phone">Telefone do gerente</Label>
              <Input id="bank-manager-phone" {...register('manager_phone')} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('active')} />
            Ativa
          </label>

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
