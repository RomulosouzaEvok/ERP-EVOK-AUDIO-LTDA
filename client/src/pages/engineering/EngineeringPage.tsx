import * as React from 'react';
import { Link } from 'react-router';
import { PencilRuler, ClipboardList, FileText, Gauge, FlaskConical } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ProjectsTab } from './ProjectsTab';
import { DrawingsTab } from './DrawingsTab';
import { TechnicalSpecTab } from './TechnicalSpecTab';
import { SampleRequestTab } from './SampleRequestTab';

type EngineeringTab = 'projects' | 'drawings' | 'technical-spec' | 'sample-request';

/** `/engineering` — Projetos de P&D, Desenhos Técnicos e Ficha Técnica (Thiele-Small). */
export default function EngineeringPage() {
  const [tab, setTab] = React.useState<EngineeringTab>('projects');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <PencilRuler className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Engenharia</h1>
            <p className="text-sm text-muted-foreground">
              Projetos de P&amp;D (PDP), desenhos técnicos e ficha técnica (Thiele-Small) dos itens.
            </p>
          </div>
        </div>
        <Link to="/production/bom" className="text-sm font-medium text-brand underline whitespace-nowrap hover:text-brand-dark">
          Ver estrutura de produto (BOM)
        </Link>
      </div>

      <div className="flex gap-1 border-b">
        <TabButton active={tab === 'projects'} icon={ClipboardList} onClick={() => setTab('projects')}>
          Projetos P&amp;D
        </TabButton>
        <TabButton active={tab === 'drawings'} icon={FileText} onClick={() => setTab('drawings')}>
          Desenhos técnicos
        </TabButton>
        <TabButton active={tab === 'technical-spec'} icon={Gauge} onClick={() => setTab('technical-spec')}>
          Ficha técnica (T-S)
        </TabButton>
        <TabButton active={tab === 'sample-request'} icon={FlaskConical} onClick={() => setTab('sample-request')}>
          Solicitar Amostra
        </TabButton>
      </div>

      {tab === 'projects' && <ProjectsTab />}
      {tab === 'drawings' && <DrawingsTab />}
      {tab === 'technical-spec' && <TechnicalSpecTab />}
      {tab === 'sample-request' && <SampleRequestTab />}
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
