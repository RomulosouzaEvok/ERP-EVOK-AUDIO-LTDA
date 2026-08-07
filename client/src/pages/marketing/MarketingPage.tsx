import * as React from 'react';
import { BarChart3, CalendarDays, Image, Megaphone, Target } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CampaignsTab } from './CampaignsTab';
import { LeadsTab } from './LeadsTab';
import { EventsTab } from './EventsTab';
import { MaterialsTab } from './MaterialsTab';
import { ReportsTab } from './ReportsTab';

type MarketingTab = 'campaigns' | 'leads' | 'events' | 'materials' | 'reports';

/**
 * `/marketing` — Marketing (departamento 14, sigla MKT), BLOCO 5 (correção).
 *
 * Cobre campanhas (orçamento solicitado/aprovado, alerta de estouro), leads
 * (funil com `in_sales_attendance`, handoff Marketing→Vendas com SLA,
 * conversão atômica dedicada, captação em lote), eventos/feiras (checklist,
 * leads vinculados, encerramento com custo real) e relatórios/KPIs de funil
 * — CRUD completo (create/list/get/update, sem delete) sobre
 * `/api/marketing/*`.
 */
export default function MarketingPage() {
  const [tab, setTab] = React.useState<MarketingTab>('leads');

  return (
    <div className="flex flex-col gap-4">
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Megaphone className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Marketing</h1>
          <p className="text-sm text-muted-foreground">
            Campanhas, funil de leads, eventos/feiras, materiais de divulgação e relatórios de funil.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b">
        <TabButton active={tab === 'leads'} icon={Target} onClick={() => setTab('leads')}>
          Leads
        </TabButton>
        <TabButton active={tab === 'campaigns'} icon={Megaphone} onClick={() => setTab('campaigns')}>
          Campanhas
        </TabButton>
        <TabButton active={tab === 'events'} icon={CalendarDays} onClick={() => setTab('events')}>
          Eventos/Feiras
        </TabButton>
        <TabButton active={tab === 'materials'} icon={Image} onClick={() => setTab('materials')}>
          Materiais
        </TabButton>
        <TabButton active={tab === 'reports'} icon={BarChart3} onClick={() => setTab('reports')}>
          Relatórios
        </TabButton>
      </div>

      <div key={tab} className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
        {tab === 'leads' && <LeadsTab />}
        {tab === 'campaigns' && <CampaignsTab />}
        {tab === 'events' && <EventsTab />}
        {tab === 'materials' && <MaterialsTab />}
        {tab === 'reports' && <ReportsTab />}
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
