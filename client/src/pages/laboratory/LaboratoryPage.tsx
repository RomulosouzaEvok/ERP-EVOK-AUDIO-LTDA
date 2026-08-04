import * as React from 'react';
import { FlaskConical, ClipboardPlus, History } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RegisterTestTab } from './RegisterTestTab';
import { TestHistoryTab } from './TestHistoryTab';

type LaboratoryTab = 'register' | 'history';

/** `/laboratory` — registro de testes acústicos/Thiele-Small e histórico com indicadores de aprovação. */
export default function LaboratoryPage() {
  const [tab, setTab] = React.useState<LaboratoryTab>('register');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <FlaskConical className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Laboratório</h1>
          <p className="text-sm text-muted-foreground">
            Registro de testes acústicos (impedância, resposta de frequência, THD, potência, Thiele-Small, etc.) e
            histórico de resultados.
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        <TabButton active={tab === 'register'} icon={ClipboardPlus} onClick={() => setTab('register')}>
          Registrar teste
        </TabButton>
        <TabButton active={tab === 'history'} icon={History} onClick={() => setTab('history')}>
          Histórico
        </TabButton>
      </div>

      {tab === 'register' && <RegisterTestTab />}
      {tab === 'history' && <TestHistoryTab />}
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
