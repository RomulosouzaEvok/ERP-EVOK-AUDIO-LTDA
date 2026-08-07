import * as React from 'react';
import { BookOpen, Calculator, ListTree } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChartOfAccountsTab } from './ChartOfAccountsTab';
import { EntriesTab } from './EntriesTab';
import { TrialBalanceTab } from './TrialBalanceTab';

type AccountingTab = 'accounts' | 'entries' | 'trial-balance';

/**
 * `/accounting` — Contabilidade (subárea CONT do departamento Financeiro,
 * sem linha própria em `departments`).
 *
 * Cobre Plano de Contas (hierárquico), Lançamentos Contábeis em partida
 * dobrada (débito = crédito ao postar) e Balancete (relatório derivado por
 * mês/ano) sobre `/api/accounting/*`.
 */
export default function AccountingPage() {
  const [tab, setTab] = React.useState<AccountingTab>('entries');

  return (
    <div className="flex flex-col gap-4">
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Calculator className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Contabilidade</h1>
          <p className="text-sm text-muted-foreground">
            Plano de contas, lançamentos contábeis (partida dobrada) e balancete.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b">
        <TabButton active={tab === 'entries'} icon={BookOpen} onClick={() => setTab('entries')}>
          Lançamentos
        </TabButton>
        <TabButton active={tab === 'accounts'} icon={ListTree} onClick={() => setTab('accounts')}>
          Plano de Contas
        </TabButton>
        <TabButton active={tab === 'trial-balance'} icon={Calculator} onClick={() => setTab('trial-balance')}>
          Balancete
        </TabButton>
      </div>

      <div key={tab} className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
        {tab === 'entries' && <EntriesTab />}
        {tab === 'accounts' && <ChartOfAccountsTab />}
        {tab === 'trial-balance' && <TrialBalanceTab />}
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
