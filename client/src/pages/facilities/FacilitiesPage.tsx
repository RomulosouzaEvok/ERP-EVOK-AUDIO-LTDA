import * as React from 'react';
import { Building2, Fuel, SprayCan, Truck, Warehouse } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FleetTab } from './FleetTab';
import { FuelRecordsTab } from './FuelRecordsTab';
import { CleaningSchedulesTab } from './CleaningSchedulesTab';
import { AreasTab } from './AreasTab';

type FacilitiesTab = 'fleet' | 'fuel' | 'cleaning' | 'areas';

/**
 * `/facilities` — Facilities (departamento 17, sigla FAC).
 *
 * Cobre o módulo essencialmente de cadastro/controle: Frota de veículos,
 * Abastecimento, Programação de Limpeza e Áreas Físicas — CRUD completo
 * (create/list/get/update, sem delete) sobre `/api/facilities/*`.
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
            Frota de veículos, abastecimento, programação de limpeza e áreas físicas.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b">
        <TabButton active={tab === 'fleet'} icon={Truck} onClick={() => setTab('fleet')}>
          Frota
        </TabButton>
        <TabButton active={tab === 'fuel'} icon={Fuel} onClick={() => setTab('fuel')}>
          Abastecimento
        </TabButton>
        <TabButton active={tab === 'cleaning'} icon={SprayCan} onClick={() => setTab('cleaning')}>
          Limpeza
        </TabButton>
        <TabButton active={tab === 'areas'} icon={Building2} onClick={() => setTab('areas')}>
          Áreas
        </TabButton>
      </div>

      <div key={tab} className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
        {tab === 'fleet' && <FleetTab />}
        {tab === 'fuel' && <FuelRecordsTab />}
        {tab === 'cleaning' && <CleaningSchedulesTab />}
        {tab === 'areas' && <AreasTab />}
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
