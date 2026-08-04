import * as React from 'react';
import { Wrench, ClipboardList } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MaintenanceOrdersTab } from './MaintenanceOrdersTab';
import { ServiceOrdersTab } from './ServiceOrdersTab';

type MaintenanceTab = 'maintenance' | 'service-orders';

/**
 * `/maintenance` — Manutenção de ativos (máquinas/equipamentos internos,
 * `asset_id`) e Ordens de Serviço de assistência técnica (produtos de
 * clientes, `client_id`/`product_id`). São dois domínios distintos
 * (`server/src/modules/maintenance` × `server/src/modules/serviceOrders`)
 * agrupados nesta tela por afinidade operacional (mesma equipe de
 * manutenção/técnicos, mesmo padrão de abertura→diagnóstico→conclusão),
 * seguindo o padrão de abas de `QualityPage.tsx`.
 */
export default function MaintenancePage() {
  const [tab, setTab] = React.useState<MaintenanceTab>('maintenance');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Wrench className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Manutenção &amp; Assistência técnica</h1>
          <p className="text-sm text-muted-foreground">
            Ordens de manutenção de ativos internos e ordens de serviço de assistência técnica a clientes.
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        <TabButton active={tab === 'maintenance'} icon={Wrench} onClick={() => setTab('maintenance')}>
          Manutenção de ativos
        </TabButton>
        <TabButton active={tab === 'service-orders'} icon={ClipboardList} onClick={() => setTab('service-orders')}>
          Ordens de serviço
        </TabButton>
      </div>

      {tab === 'maintenance' && <MaintenanceOrdersTab />}
      {tab === 'service-orders' && <ServiceOrdersTab />}
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
