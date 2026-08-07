import * as React from 'react';
import { useQuery } from '@tanstack/react-query';

import * as accountingApi from '@/api/accounting';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const TYPE_LABELS: Record<accountingApi.AccountType, string> = {
  asset: 'Ativo',
  liability: 'Passivo',
  equity: 'Patrimônio Líquido',
  revenue: 'Receita',
  expense: 'Despesa',
  cost: 'Custo',
};

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Aba "Balancete" de `/accounting` — relatório derivado por mês/ano (`GET /api/accounting/trial-balance`). */
export function TrialBalanceTab() {
  const today = new Date();
  const [year, setYear] = React.useState(today.getFullYear());
  const [month, setMonth] = React.useState(today.getMonth() + 1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['accounting-trial-balance', year, month],
    queryFn: () => accountingApi.getTrialBalance(year, month),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="trial-balance-year" className="text-sm text-muted-foreground">
            Ano
          </Label>
          <Input
            id="trial-balance-year"
            type="number"
            className="w-28"
            value={year}
            onChange={(event) => setYear(Number(event.target.value) || today.getFullYear())}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="trial-balance-month" className="text-sm text-muted-foreground">
            Mês
          </Label>
          <Input
            id="trial-balance-month"
            type="number"
            min={1}
            max={12}
            className="w-24"
            value={month}
            onChange={(event) => setMonth(Number(event.target.value) || 1)}
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Conta</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Saldo anterior</TableHead>
            <TableHead className="text-right">Débito do mês</TableHead>
            <TableHead className="text-right">Crédito do mês</TableHead>
            <TableHead className="text-right">Saldo atual</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={7} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-destructive">
                Não foi possível carregar o balancete. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.accounts.map((row) => (
            <TableRow key={row.account_id}>
              <TableCell className="font-mono text-xs">{row.code}</TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell className="text-xs">{TYPE_LABELS[row.account_type]}</TableCell>
              <TableCell className="text-right text-xs">{formatMoney(row.previous_balance)}</TableCell>
              <TableCell className="text-right text-xs">{formatMoney(row.debit_movement)}</TableCell>
              <TableCell className="text-right text-xs">{formatMoney(row.credit_movement)}</TableCell>
              <TableCell className="text-right text-xs font-semibold">{formatMoney(row.current_balance)}</TableCell>
            </TableRow>
          ))}
          {data && (
            <TableRow className="border-t-2 font-semibold">
              <TableCell colSpan={3}>Totais</TableCell>
              <TableCell className="text-right text-xs">{formatMoney(data.totals.previous_balance)}</TableCell>
              <TableCell className="text-right text-xs">{formatMoney(data.totals.debit_movement)}</TableCell>
              <TableCell className="text-right text-xs">{formatMoney(data.totals.credit_movement)}</TableCell>
              <TableCell className="text-right text-xs">{formatMoney(data.totals.current_balance)}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
