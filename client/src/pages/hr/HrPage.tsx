import * as React from 'react';
import { Users, Building2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DepartmentsTab } from './DepartmentsTab';
import { EmployeesTab } from './EmployeesTab';

type HrTab = 'employees' | 'departments';

/**
 * `/hr` — RH: cadastro de Funcionários (aba padrão) e Departamentos.
 * Segue o mesmo padrão de abas locais (sem lib de Tabs) de
 * `client/src/pages/logistics/InventoryPage.tsx`.
 *
 * Ambos os módulos de backend (`/api/employees`, `/api/departments`) exigem
 * apenas sessão autenticada para leitura; escrita exige role `admin` — não
 * há módulo dedicado em `access-profiles` para RH hoje, então o gate de
 * escrita nas abas usa `hasRole('admin')` diretamente (replica o backend).
 */
export default function HrPage() {
  const [tab, setTab] = React.useState<HrTab>('employees');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Users className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Recursos Humanos</h1>
          <p className="text-sm text-muted-foreground">Cadastro de funcionários e departamentos da organização.</p>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        <TabButton active={tab === 'employees'} icon={Users} onClick={() => setTab('employees')}>
          Funcionários
        </TabButton>
        <TabButton active={tab === 'departments'} icon={Building2} onClick={() => setTab('departments')}>
          Departamentos
        </TabButton>
      </div>

      {tab === 'employees' && <EmployeesTab />}
      {tab === 'departments' && <DepartmentsTab />}
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
