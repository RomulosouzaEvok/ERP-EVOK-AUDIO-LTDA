import * as React from 'react';
import { FileText, Lightbulb, Scale } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ContractsTab } from './ContractsTab';
import { IntellectualPropertyTab } from './IntellectualPropertyTab';

type LegalTab = 'contracts' | 'intellectual-property';

/**
 * `/legal` — Jurídico (departamento 16, sigla JUR).
 *
 * Cobre contratos (com aditivos, lembretes de prazo e upload de
 * instrumento) e propriedade intelectual — CRUD completo (create/list/get/
 * update, sem delete) sobre `/api/legal/*`.
 */
export default function LegalPage() {
  const [tab, setTab] = React.useState<LegalTab>('contracts');

  return (
    <div className="flex flex-col gap-4">
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Scale className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Jurídico</h1>
          <p className="text-sm text-muted-foreground">
            Contratos (trabalhistas e comerciais) e propriedade intelectual.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b">
        <TabButton active={tab === 'contracts'} icon={FileText} onClick={() => setTab('contracts')}>
          Contratos
        </TabButton>
        <TabButton active={tab === 'intellectual-property'} icon={Lightbulb} onClick={() => setTab('intellectual-property')}>
          Propriedade Intelectual
        </TabButton>
      </div>

      <div key={tab} className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
        {tab === 'contracts' && <ContractsTab />}
        {tab === 'intellectual-property' && <IntellectualPropertyTab />}
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
