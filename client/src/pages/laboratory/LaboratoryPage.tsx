import * as React from 'react';

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
      <div>
        <h1 className="text-2xl font-semibold">Laboratório</h1>
        <p className="text-sm text-muted-foreground">
          Registro de testes acústicos (impedância, resposta de frequência, THD, potência, Thiele-Small, etc.) e
          histórico de resultados.
        </p>
      </div>

      <div className="flex gap-1 border-b">
        <TabButton active={tab === 'register'} onClick={() => setTab('register')}>
          Registrar teste
        </TabButton>
        <TabButton active={tab === 'history'} onClick={() => setTab('history')}>
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
