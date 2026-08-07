import * as React from 'react';
import { useQuery } from '@tanstack/react-query';

import * as treasuryApi from '@/api/treasury';
import { DidacticAlert } from '@/components/DidacticAlert';
import { translateApiError } from '@/lib/translateApiError';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const TYPE_LABELS: Record<string, string> = {
  corrente: 'Corrente',
  poupanca: 'Poupança',
  aplicacao: 'Aplicação',
};

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: 'positive' | 'negative' }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border p-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xl font-semibold ${tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-destructive' : ''}`}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}

/**
 * Aba "Posição de Caixa" de `/treasury` — relatório derivado consolidando o
 * saldo atual de todas as contas bancárias ativas com o resumo de títulos
 * em aberto de contas a pagar/receber.
 */
export function CashPositionTab() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['treasury-cash-position'],
    queryFn: () => treasuryApi.getCashPosition(),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando posição de caixa...</p>;
  }

  if (isError || !data) {
    return <DidacticAlert error={translateApiError(error, 'Não foi possível carregar a posição de caixa')} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs text-muted-foreground">Posição em {new Date(`${data.as_of}T00:00:00`).toLocaleDateString('pt-BR')}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Saldo total em contas" value={data.bank_accounts.total_balance} />
        <SummaryCard label="A receber (em aberto)" value={data.open_titles.total_receivable} tone="positive" />
        <SummaryCard label="A pagar (em aberto)" value={data.open_titles.total_payable} tone="negative" />
        <SummaryCard label="Saldo projetado" value={data.projected_balance} tone={data.projected_balance >= 0 ? 'positive' : 'negative'} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SummaryCard label="Vencido a receber" value={data.open_titles.overdue_receivable} tone="positive" />
        <SummaryCard label="Vencido a pagar" value={data.open_titles.overdue_payable} tone="negative" />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Saldo por tipo de conta</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Object.entries(data.bank_accounts.balance_by_type).map(([type, balance]) => (
            <SummaryCard key={type} label={TYPE_LABELS[type] ?? type} value={balance} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Contas bancárias ativas ({data.bank_accounts.count})</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Banco</TableHead>
              <TableHead>Agência</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.bank_accounts.accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell>{account.bank_name}</TableCell>
                <TableCell className="font-mono text-xs">{account.agency}</TableCell>
                <TableCell className="font-mono text-xs">{account.account_number}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{TYPE_LABELS[account.account_type] ?? account.account_type}</Badge>
                </TableCell>
                <TableCell>{formatCurrency(account.current_balance)}</TableCell>
              </TableRow>
            ))}
            {data.bank_accounts.accounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhuma conta bancária ativa cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
