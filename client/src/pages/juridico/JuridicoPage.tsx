import * as React from 'react';
import { FileText, Gavel, Scale, ScrollText, Copyright, ShieldAlert, Bell } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ContractsTab } from './ContractsTab';
import { LegalCasesTab } from './LegalCasesTab';
import { DeadlinesTab } from './DeadlinesTab';
import { ProxiesTab } from './ProxiesTab';
import { IpAssetsTab } from './IpAssetsTab';
import { LgpdTab } from './LgpdTab';
import { AlertsReportsTab } from './AlertsReportsTab';

type JurTab = 'contracts' | 'legal-cases' | 'deadlines' | 'proxies' | 'ip-assets' | 'lgpd' | 'reports';

/**
 * `/juridico` — Jurídico (departamento 16), BLOCO 3. Substitui `/legal`
 * (módulo enxuto removido). Cobre contratos (UC-52), contencioso (UC-53),
 * prazos fatais (UC-54, o fluxo mais crítico), procurações (UC-55),
 * propriedade intelectual e LGPD (UC-56).
 *
 * Rota liberada por `AnyModuleRoute(['juridico', 'financeiro'])` em
 * `App.tsx` — quem só tem `financeiro` (sem `juridico`) enxerga apenas a
 * aba "Alertas & Relatório Financeiro" (RF-JUR-042/BR-JUR-050, exceção de
 * campo do relatório sanitizado), nunca contratos/contencioso/LGPD/PI.
 */
export default function JuridicoPage() {
  const { hasModuleAccess } = useAuth();
  const hasFullAccess = hasModuleAccess('juridico');
  const [tab, setTab] = React.useState<JurTab>(hasFullAccess ? 'deadlines' : 'reports');

  return (
    <div className="flex flex-col gap-4">
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Scale className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Jurídico</h1>
          <p className="text-sm text-muted-foreground">
            Contratos, contencioso, prazos fatais, procurações, propriedade intelectual e LGPD.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b">
        {hasFullAccess && (
          <>
            <TabButton active={tab === 'contracts'} icon={FileText} onClick={() => setTab('contracts')}>
              Contratos
            </TabButton>
            <TabButton active={tab === 'legal-cases'} icon={Gavel} onClick={() => setTab('legal-cases')}>
              Contencioso
            </TabButton>
            <TabButton active={tab === 'deadlines'} icon={ShieldAlert} onClick={() => setTab('deadlines')}>
              Prazos Fatais
            </TabButton>
            <TabButton active={tab === 'proxies'} icon={ScrollText} onClick={() => setTab('proxies')}>
              Procurações
            </TabButton>
            <TabButton active={tab === 'ip-assets'} icon={Copyright} onClick={() => setTab('ip-assets')}>
              Propriedade Intelectual
            </TabButton>
            <TabButton active={tab === 'lgpd'} icon={ShieldAlert} onClick={() => setTab('lgpd')}>
              LGPD
            </TabButton>
          </>
        )}
        <TabButton active={tab === 'reports'} icon={Bell} onClick={() => setTab('reports')}>
          Alertas & Relatório Financeiro
        </TabButton>
      </div>

      <div key={tab} className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
        {hasFullAccess && tab === 'contracts' && <ContractsTab />}
        {hasFullAccess && tab === 'legal-cases' && <LegalCasesTab />}
        {hasFullAccess && tab === 'deadlines' && <DeadlinesTab />}
        {hasFullAccess && tab === 'proxies' && <ProxiesTab />}
        {hasFullAccess && tab === 'ip-assets' && <IpAssetsTab />}
        {hasFullAccess && tab === 'lgpd' && <LgpdTab />}
        {tab === 'reports' && <AlertsReportsTab hasFullAccess={hasFullAccess} />}
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
