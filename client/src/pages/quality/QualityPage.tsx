import * as React from 'react';
import { ShieldCheck, PackageSearch, AlertOctagon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InspectionTab } from './InspectionTab';
import { NonConformitiesTab } from './NonConformitiesTab';
import type { NonConformityPrefill } from './NonConformitiesTab';

type QualityTab = 'inspection' | 'non-conformities';

/** `/quality` — inspeção de recebimento (lotes em quarentena) e não-conformidades (RNC). */
export default function QualityPage() {
  const [tab, setTab] = React.useState<QualityTab>('inspection');
  const [ncPrefill, setNcPrefill] = React.useState<NonConformityPrefill | null>(null);

  const openNonConformityWithPrefill = (prefill: NonConformityPrefill) => {
    setNcPrefill(prefill);
    setTab('non-conformities');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Qualidade</h1>
          <p className="text-sm text-muted-foreground">
            Inspeção de recebimento de lotes e registro/acompanhamento de não-conformidades (RNC).
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        <TabButton active={tab === 'inspection'} icon={PackageSearch} onClick={() => setTab('inspection')}>
          Inspeção de recebimento
        </TabButton>
        <TabButton active={tab === 'non-conformities'} icon={AlertOctagon} onClick={() => setTab('non-conformities')}>
          Não-conformidades (RNC)
        </TabButton>
      </div>

      {tab === 'inspection' && <InspectionTab onOpenNonConformity={openNonConformityWithPrefill} />}
      {tab === 'non-conformities' && (
        <NonConformitiesTab prefill={ncPrefill} onPrefillConsumed={() => setNcPrefill(null)} />
      )}
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
      className={cn(
        'rounded-none border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-brand/5 hover:text-brand',
        active && 'border-brand text-brand',
      )}
    >
      <Icon className="size-4" />
      {children}
    </Button>
  );
}
