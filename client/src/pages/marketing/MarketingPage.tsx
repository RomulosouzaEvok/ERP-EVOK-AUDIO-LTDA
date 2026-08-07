import * as React from 'react';
import { Image, Megaphone, Target } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CampaignsTab } from './CampaignsTab';
import { LeadsTab } from './LeadsTab';
import { MaterialsTab } from './MaterialsTab';

type MarketingTab = 'campaigns' | 'leads' | 'materials';

/**
 * `/marketing` — Marketing (departamento 14, sigla MKT).
 *
 * Cobre o módulo de campanhas, leads (com funil dedicado) e materiais de
 * divulgação — CRUD completo (create/list/get/update, sem delete) sobre
 * `/api/marketing/*`.
 */
export default function MarketingPage() {
  const [tab, setTab] = React.useState<MarketingTab>('campaigns');

  return (
    <div className="flex flex-col gap-4">
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Megaphone className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Marketing</h1>
          <p className="text-sm text-muted-foreground">
            Campanhas, funil de leads e materiais de divulgação.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b">
        <TabButton active={tab === 'campaigns'} icon={Megaphone} onClick={() => setTab('campaigns')}>
          Campanhas
        </TabButton>
        <TabButton active={tab === 'leads'} icon={Target} onClick={() => setTab('leads')}>
          Leads
        </TabButton>
        <TabButton active={tab === 'materials'} icon={Image} onClick={() => setTab('materials')}>
          Materiais
        </TabButton>
      </div>

      <div key={tab} className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
        {tab === 'campaigns' && <CampaignsTab />}
        {tab === 'leads' && <LeadsTab />}
        {tab === 'materials' && <MaterialsTab />}
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
