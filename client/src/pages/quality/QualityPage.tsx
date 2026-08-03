import * as React from 'react';

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
      <div>
        <h1 className="text-2xl font-semibold">Qualidade</h1>
        <p className="text-sm text-muted-foreground">
          Inspeção de recebimento de lotes e registro/acompanhamento de não-conformidades (RNC).
        </p>
      </div>

      <div className="flex gap-1 border-b">
        <TabButton active={tab === 'inspection'} onClick={() => setTab('inspection')}>
          Inspeção de recebimento
        </TabButton>
        <TabButton active={tab === 'non-conformities'} onClick={() => setTab('non-conformities')}>
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
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        'rounded-none border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-transparent hover:text-foreground',
        active && 'border-primary text-foreground',
      )}
    >
      {children}
    </Button>
  );
}
