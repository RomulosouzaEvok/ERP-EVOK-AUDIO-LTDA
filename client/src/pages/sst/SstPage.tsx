import * as React from 'react';
import { HardHat, Stethoscope, FileWarning, Send, Users, GraduationCap, ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EpiTab } from './EpiTab';
import { AsoTab } from './AsoTab';
import { AccidentsTab } from './AccidentsTab';
import { EsocialTab } from './EsocialTab';
import { CipaTab } from './CipaTab';
import { TrainingsTab } from './TrainingsTab';

type SstTab = 'epi' | 'aso' | 'accidents' | 'esocial' | 'cipa' | 'trainings';

/**
 * `/sst` — Segurança e Saúde do Trabalho (departamento 15), BLOCO 1.
 *
 * Cobre os 5 UCs P0 (EPI/UC-44, ASO/UC-45, Acidente+CAT/UC-46, fila
 * eSocial/UC-47, CIPA/UC-48) + Treinamentos (RF-SST-044 a 047). PGR/GES e
 * Rotina Preventiva (Inspeções, PT, Brigada, DDS) ficaram fora desta
 * passada — ver `docs/governance/HANDOFF_CODEX.md`.
 */
export default function SstPage() {
  const [tab, setTab] = React.useState<SstTab>('epi');

  return (
    <div className="flex flex-col gap-4">
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <ShieldAlert className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Segurança e Saúde do Trabalho (SST)</h1>
          <p className="text-sm text-muted-foreground">
            EPI, ASO/PCMSO, acidentes de trabalho e CAT, fila eSocial, CIPA e treinamentos de segurança.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b">
        <TabButton active={tab === 'epi'} icon={HardHat} onClick={() => setTab('epi')}>
          EPI
        </TabButton>
        <TabButton active={tab === 'aso'} icon={Stethoscope} onClick={() => setTab('aso')}>
          ASO
        </TabButton>
        <TabButton active={tab === 'accidents'} icon={FileWarning} onClick={() => setTab('accidents')}>
          Acidentes
        </TabButton>
        <TabButton active={tab === 'esocial'} icon={Send} onClick={() => setTab('esocial')}>
          eSocial
        </TabButton>
        <TabButton active={tab === 'cipa'} icon={Users} onClick={() => setTab('cipa')}>
          CIPA
        </TabButton>
        <TabButton active={tab === 'trainings'} icon={GraduationCap} onClick={() => setTab('trainings')}>
          Treinamentos
        </TabButton>
      </div>

      <div key={tab} className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
        {tab === 'epi' && <EpiTab />}
        {tab === 'aso' && <AsoTab />}
        {tab === 'accidents' && <AccidentsTab />}
        {tab === 'esocial' && <EsocialTab />}
        {tab === 'cipa' && <CipaTab />}
        {tab === 'trainings' && <TrainingsTab />}
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
