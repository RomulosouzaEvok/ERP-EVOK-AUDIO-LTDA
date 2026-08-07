import * as React from 'react';
import { Banknote, Landmark, LineChart } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FinancialOperationsTab } from './FinancialOperationsTab';
import { CashPositionTab } from './CashPositionTab';
import { BankAccountsTab } from './BankAccountsTab';

type TreasuryTab = 'operations' | 'cash-position' | 'bank-accounts';

/**
 * `/treasury` — Tesouraria (subárea TES do departamento Financeiro, sem
 * linha própria em `departments`).
 *
 * Cobre Operações Financeiras (empréstimos, aplicações, financiamentos,
 * leasing), Posição de Caixa (relatório derivado) e Contas Bancárias
 * (cadastro operacional) sobre `/api/treasury/*`. Conciliação bancária
 * OFX/CNAB permanece no módulo Financeiro (`/financial`), não é duplicada
 * aqui.
 */
export default function TreasuryPage() {
  const [tab, setTab] = React.useState<TreasuryTab>('operations');

  return (
    <div className="flex flex-col gap-4">
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Landmark className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Tesouraria</h1>
          <p className="text-sm text-muted-foreground">
            Contas bancárias, operações financeiras (empréstimos, aplicações, financiamentos, leasing) e posição de caixa consolidada.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b">
        <TabButton active={tab === 'operations'} icon={Banknote} onClick={() => setTab('operations')}>
          Operações Financeiras
        </TabButton>
        <TabButton active={tab === 'cash-position'} icon={LineChart} onClick={() => setTab('cash-position')}>
          Posição de Caixa
        </TabButton>
        <TabButton active={tab === 'bank-accounts'} icon={Landmark} onClick={() => setTab('bank-accounts')}>
          Contas Bancárias
        </TabButton>
      </div>

      <div key={tab} className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
        {tab === 'operations' && <FinancialOperationsTab />}
        {tab === 'cash-position' && <CashPositionTab />}
        {tab === 'bank-accounts' && <BankAccountsTab />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      aria-selected={active}
      className={cn(
        'rounded-none border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-brand/5 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
        active && 'border-brand text-brand',
      )}
    >
      <Icon className="size-4" />
      {children}
    </Button>
  );
}
