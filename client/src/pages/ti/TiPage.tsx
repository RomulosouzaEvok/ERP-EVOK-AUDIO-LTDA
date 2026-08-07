import * as React from 'react';
import { LifeBuoy, Package, ShieldCheck, KeyRound, DatabaseBackup, Server } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TicketsTab } from './TicketsTab';
import { TermsTab } from './TermsTab';
import { LicensesTab } from './LicensesTab';
import { AccessRequestsTab } from './AccessRequestsTab';
import { BackupTab } from './BackupTab';

type TiTab = 'tickets' | 'terms' | 'licenses' | 'access' | 'backup';

/**
 * `/ti` — Tecnologia da Informação (departamento 13), BLOCO 2.
 *
 * Cobre a visão de GESTÃO (módulo `ti`, ti:operate/ti:approve): fila de
 * chamados (UC-49, terceiros), termos de responsabilidade (UC-50), licenças
 * de software (P3), solicitações de acesso (UC-51) e backup/continuidade
 * (P5). A abertura/acompanhamento do PRÓPRIO chamado é uma rota separada,
 * `/meus-chamados` (`MyTicketsPage`), acessível a qualquer usuário
 * autenticado sem exigir este módulo.
 */
export default function TiPage() {
  const [tab, setTab] = React.useState<TiTab>('tickets');

  return (
    <div className="flex flex-col gap-4">
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Server className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Tecnologia da Informação (TI)</h1>
          <p className="text-sm text-muted-foreground">
            Fila de chamados, termos de responsabilidade, licenças de software, solicitações de acesso e backup.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b">
        <TabButton active={tab === 'tickets'} icon={LifeBuoy} onClick={() => setTab('tickets')}>
          Fila de Chamados
        </TabButton>
        <TabButton active={tab === 'terms'} icon={Package} onClick={() => setTab('terms')}>
          Termos de Responsabilidade
        </TabButton>
        <TabButton active={tab === 'licenses'} icon={ShieldCheck} onClick={() => setTab('licenses')}>
          Licenças
        </TabButton>
        <TabButton active={tab === 'access'} icon={KeyRound} onClick={() => setTab('access')}>
          Acessos
        </TabButton>
        <TabButton active={tab === 'backup'} icon={DatabaseBackup} onClick={() => setTab('backup')}>
          Backup
        </TabButton>
      </div>

      <div key={tab} className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
        {tab === 'tickets' && <TicketsTab />}
        {tab === 'terms' && <TermsTab />}
        {tab === 'licenses' && <LicensesTab />}
        {tab === 'access' && <AccessRequestsTab />}
        {tab === 'backup' && <BackupTab />}
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
