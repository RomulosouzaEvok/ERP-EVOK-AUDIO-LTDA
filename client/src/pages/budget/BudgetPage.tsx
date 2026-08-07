import * as React from 'react';
import { ListChecks, PiggyBank, TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BudgetLinesTab } from './BudgetLinesTab';
import { BudgetReportTab } from './BudgetReportTab';

type BudgetTab = 'lines' | 'report';

/**
 * `/budget` — Controladoria (subárea CTR do departamento Financeiro, sem
 * linha própria em `departments`).
 *
 * Cobre a única peça genuinamente nova da subárea: Orçamento (linhas de
 * orçamento por centro de custo + acompanhamento orçado × realizado).
 * Custeio industrial (mão-de-obra/overhead) já existe em Produção/Relatórios
 * e Centros de Custo já existem em `/financial` — nenhum dos dois é
 * duplicado aqui.
 */
export default function BudgetPage() {
  const [tab, setTab] = React.useState<BudgetTab>('lines');

  return (
    <div className="flex flex-col gap-4">
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <PiggyBank className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Controladoria</h1>
          <p className="text-sm text-muted-foreground">
            Orçamento anual/mensal por centro de custo e acompanhamento orçado × realizado.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b">
        <TabButton active={tab === 'lines'} icon={ListChecks} onClick={() => setTab('lines')}>
          Linhas de Orçamento
        </TabButton>
        <TabButton active={tab === 'report'} icon={TrendingUp} onClick={() => setTab('report')}>
          Orçado × Realizado
        </TabButton>
      </div>

      <div key={tab} className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
        {tab === 'lines' && <BudgetLinesTab />}
        {tab === 'report' && <BudgetReportTab />}
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
