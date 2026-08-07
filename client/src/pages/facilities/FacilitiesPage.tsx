import * as React from 'react';
import { Building2, Mail, SprayCan, Truck, Users, Warehouse, Wrench, CalendarClock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FleetTab } from './FleetTab';
import { MaintenanceTicketsTab } from './MaintenanceTicketsTab';
import { VisitorsTab } from './VisitorsTab';
import { CleaningTab } from './CleaningTab';
import { ReservationsTab } from './ReservationsTab';
import { AreasTab } from './AreasTab';
import { CorrespondenceTab } from './CorrespondenceTab';

type FacilitiesTab = 'fleet' | 'maintenance' | 'visitors' | 'cleaning' | 'reservations' | 'areas' | 'correspondence';

/**
 * `/facilities` — Facilities (departamento 17, sigla FAC), BLOCO 4
 * (correção 2026-08-07). Cobre Frota (veículo como extensão de Asset, D-2 —
 * documentos, condutores/CNH, diário de uso com integridade de odômetro,
 * abastecimento, multas com prazo legal de indicação), Manutenção Predial
 * (D-1, sobre `maintenance_orders`), Visitantes (check-in/check-out,
 * mascarado por LGPD), Limpeza (plano×execução com aderência), Reservas de
 * recursos, Áreas físicas e Correspondência.
 *
 * A abertura de chamado predial por qualquer funcionário (auto-serviço,
 * RF-FAC-040) fica fora deste módulo, em `/chamado-predial`.
 */
export default function FacilitiesPage() {
  const [tab, setTab] = React.useState<FacilitiesTab>('fleet');

  return (
    <div className="flex flex-col gap-4">
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Warehouse className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Facilities</h1>
          <p className="text-sm text-muted-foreground">
            Frota de veículos, manutenção predial, visitantes, limpeza, reservas, áreas físicas e correspondência.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b">
        <TabButton active={tab === 'fleet'} icon={Truck} onClick={() => setTab('fleet')}>
          Frota
        </TabButton>
        <TabButton active={tab === 'maintenance'} icon={Wrench} onClick={() => setTab('maintenance')}>
          Manutenção Predial
        </TabButton>
        <TabButton active={tab === 'visitors'} icon={Users} onClick={() => setTab('visitors')}>
          Visitantes
        </TabButton>
        <TabButton active={tab === 'cleaning'} icon={SprayCan} onClick={() => setTab('cleaning')}>
          Limpeza
        </TabButton>
        <TabButton active={tab === 'reservations'} icon={CalendarClock} onClick={() => setTab('reservations')}>
          Reservas
        </TabButton>
        <TabButton active={tab === 'areas'} icon={Building2} onClick={() => setTab('areas')}>
          Áreas
        </TabButton>
        <TabButton active={tab === 'correspondence'} icon={Mail} onClick={() => setTab('correspondence')}>
          Correspondência
        </TabButton>
      </div>

      <div key={tab} className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
        {tab === 'fleet' && <FleetTab />}
        {tab === 'maintenance' && <MaintenanceTicketsTab />}
        {tab === 'visitors' && <VisitorsTab />}
        {tab === 'cleaning' && <CleaningTab />}
        {tab === 'reservations' && <ReservationsTab />}
        {tab === 'areas' && <AreasTab />}
        {tab === 'correspondence' && <CorrespondenceTab />}
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
