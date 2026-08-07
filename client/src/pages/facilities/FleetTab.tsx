import * as React from 'react';
import { AlertTriangle, Fuel, IdCard, Route, Truck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VehiclesPanel } from './VehiclesPanel';
import { DriversPanel } from './DriversPanel';
import { TripsPanel } from './TripsPanel';
import { FuelRecordsPanel } from './FuelRecordsPanel';
import { FinesPanel } from './FinesPanel';

type FleetSubTab = 'vehicles' | 'drivers' | 'trips' | 'fuel' | 'fines';

/**
 * Aba "Frota" de `/facilities` — UC-58/UC-59. Reúne veículos (extensão de
 * Asset, D-2), condutores (CNH), diário de uso (saída/retorno com
 * integridade de odômetro), abastecimento e multas (semáforo de prazo de
 * indicação de condutor) em sub-abas, já que cada uma tem sua própria
 * listagem/formulário.
 */
export function FleetTab() {
  const [subTab, setSubTab] = React.useState<FleetSubTab>('vehicles');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1 border-b">
        <SubTabButton active={subTab === 'vehicles'} icon={Truck} onClick={() => setSubTab('vehicles')}>
          Veículos
        </SubTabButton>
        <SubTabButton active={subTab === 'drivers'} icon={IdCard} onClick={() => setSubTab('drivers')}>
          Condutores
        </SubTabButton>
        <SubTabButton active={subTab === 'trips'} icon={Route} onClick={() => setSubTab('trips')}>
          Diário de Uso
        </SubTabButton>
        <SubTabButton active={subTab === 'fuel'} icon={Fuel} onClick={() => setSubTab('fuel')}>
          Abastecimento
        </SubTabButton>
        <SubTabButton active={subTab === 'fines'} icon={AlertTriangle} onClick={() => setSubTab('fines')}>
          Multas
        </SubTabButton>
      </div>

      <div key={subTab}>
        {subTab === 'vehicles' && <VehiclesPanel />}
        {subTab === 'drivers' && <DriversPanel />}
        {subTab === 'trips' && <TripsPanel />}
        {subTab === 'fuel' && <FuelRecordsPanel />}
        {subTab === 'fines' && <FinesPanel />}
      </div>
    </div>
  );
}

function SubTabButton({
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
      size="sm"
      onClick={onClick}
      aria-selected={active}
      className={cn(
        'rounded-none border-b-2 border-transparent px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-brand/5 hover:text-brand',
        active && 'border-brand text-brand',
      )}
    >
      <Icon className="size-3.5" />
      {children}
    </Button>
  );
}
