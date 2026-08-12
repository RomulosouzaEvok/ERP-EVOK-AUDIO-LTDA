import * as React from 'react';
import { CalendarRange, Crown, ScrollText, ShieldAlert, Workflow } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OrgChartTab } from './OrgChartTab';
import { StrategicPlanningTab } from './StrategicPlanningTab';
import { MeetingMinutesTab } from './MeetingMinutesTab';
import { BusinessRisksTab } from './BusinessRisksTab';

type DirectorateTab = 'org-chart' | 'strategic-planning' | 'meeting-minutes' | 'business-risks';

/**
 * `/directorate` — Diretoria: organograma executivo, planejamento
 * estratégico, atas de reunião e riscos corporativos
 * (`/api/directorate/*`, entregue 2026-08-12).
 *
 * A leitura de `GET /org-chart` é liberada a qualquer autenticado no
 * backend; as demais rotas (planejamento/atas/riscos) exigem o módulo
 * `diretoria`. A rota inteira é protegida por `ModuleRoute module="diretoria"`
 * em `App.tsx` (mesmo padrão de `/dashboard`/`diretor`) — quem não tem o
 * módulo vê a tela de "Acesso negado" em vez de uma tela quebrada.
 *
 * Escrita (provimento de cargo, criar/editar planejamento, registrar ata,
 * criar/editar risco) exige nível `diretoria:approve` — cada aba resolve
 * isso localmente via `hasRole('admin') || permissions?.diretoria === 'approve'`.
 */
export default function DirectoratePage() {
  const [tab, setTab] = React.useState<DirectorateTab>('org-chart');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Crown className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Diretoria</h1>
          <p className="text-sm text-muted-foreground">Organograma executivo, planejamento estratégico, atas de reunião e riscos corporativos.</p>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        <TabButton active={tab === 'org-chart'} icon={Workflow} onClick={() => setTab('org-chart')}>
          Organograma
        </TabButton>
        <TabButton active={tab === 'strategic-planning'} icon={CalendarRange} onClick={() => setTab('strategic-planning')}>
          Planejamento Estratégico
        </TabButton>
        <TabButton active={tab === 'meeting-minutes'} icon={ScrollText} onClick={() => setTab('meeting-minutes')}>
          Atas de Reunião
        </TabButton>
        <TabButton active={tab === 'business-risks'} icon={ShieldAlert} onClick={() => setTab('business-risks')}>
          Riscos
        </TabButton>
      </div>

      {tab === 'org-chart' && <OrgChartTab />}
      {tab === 'strategic-planning' && <StrategicPlanningTab />}
      {tab === 'meeting-minutes' && <MeetingMinutesTab />}
      {tab === 'business-risks' && <BusinessRisksTab />}
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
