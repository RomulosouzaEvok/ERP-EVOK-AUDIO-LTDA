import * as React from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ProjectsTab } from './ProjectsTab';
import { DrawingsTab } from './DrawingsTab';
import { TechnicalSpecTab } from './TechnicalSpecTab';

type EngineeringTab = 'projects' | 'drawings' | 'technical-spec';

/** `/engineering` — Projetos de P&D, Desenhos Técnicos e Ficha Técnica (Thiele-Small). */
export default function EngineeringPage() {
  const [tab, setTab] = React.useState<EngineeringTab>('projects');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Engenharia</h1>
          <p className="text-sm text-muted-foreground">
            Projetos de P&amp;D (PDP), desenhos técnicos e ficha técnica (Thiele-Small) dos itens.
          </p>
        </div>
        <Link to="/production/bom" className="text-sm font-medium text-primary underline whitespace-nowrap">
          Ver estrutura de produto (BOM)
        </Link>
      </div>

      <div className="flex gap-1 border-b">
        <TabButton active={tab === 'projects'} onClick={() => setTab('projects')}>
          Projetos P&amp;D
        </TabButton>
        <TabButton active={tab === 'drawings'} onClick={() => setTab('drawings')}>
          Desenhos técnicos
        </TabButton>
        <TabButton active={tab === 'technical-spec'} onClick={() => setTab('technical-spec')}>
          Ficha técnica (T-S)
        </TabButton>
      </div>

      {tab === 'projects' && <ProjectsTab />}
      {tab === 'drawings' && <DrawingsTab />}
      {tab === 'technical-spec' && <TechnicalSpecTab />}
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
