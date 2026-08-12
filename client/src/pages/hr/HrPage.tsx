import * as React from 'react';
import { Users, Building2, UserPlus, FileSignature, UserMinus, Palmtree, CalendarOff, Gift, GraduationCap, Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DepartmentsTab } from './DepartmentsTab';
import { EmployeesTab } from './EmployeesTab';
import { AdmissionTab } from './AdmissionTab';
import { EmployeeContractsTab } from './EmployeeContractsTab';
import { TerminationTab } from './TerminationTab';
import { VacationTab } from './VacationTab';
import { AbsencesTab } from './AbsencesTab';
import { BenefitsTab } from './BenefitsTab';
import { TrainingsTab } from './TrainingsTab';
import { AttendanceTab } from './AttendanceTab';

type HrTab =
  | 'employees'
  | 'departments'
  | 'admission'
  | 'contracts'
  | 'termination'
  | 'vacation'
  | 'absences'
  | 'benefits'
  | 'trainings'
  | 'attendance';

/**
 * `/hr` — RH: cadastro de Funcionários e Departamentos (módulo já existente,
 * `hasRole('admin')`) mais os fluxos do Bloco 6 (`/api/rh/*`, RBAC por
 * módulo `rh`, ver `docs/business/BLOCO_6_RH_API.md`): Admissão (UC-69),
 * Contratos de Experiência (UC-68), Demissão (UC-70), Férias (UC-67),
 * Afastamentos (UC-71), Benefícios e Treinamentos. Segue o mesmo padrão de
 * abas locais (sem lib de Tabs) de `client/src/pages/logistics/InventoryPage.tsx`.
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
        <TabButton active={tab === 'admission'} icon={UserPlus} onClick={() => setTab('admission')}>
          Admissão
        </TabButton>
        <TabButton active={tab === 'contracts'} icon={FileSignature} onClick={() => setTab('contracts')}>
          Contratos
        </TabButton>
        <TabButton active={tab === 'termination'} icon={UserMinus} onClick={() => setTab('termination')}>
          Demissão
        </TabButton>
        <TabButton active={tab === 'vacation'} icon={Palmtree} onClick={() => setTab('vacation')}>
          Férias
        </TabButton>
        <TabButton active={tab === 'absences'} icon={CalendarOff} onClick={() => setTab('absences')}>
          Afastamentos
        </TabButton>
        <TabButton active={tab === 'benefits'} icon={Gift} onClick={() => setTab('benefits')}>
          Benefícios
        </TabButton>
        <TabButton active={tab === 'trainings'} icon={GraduationCap} onClick={() => setTab('trainings')}>
          Treinamentos
        </TabButton>
        <TabButton active={tab === 'attendance'} icon={Clock} onClick={() => setTab('attendance')}>
          Frequência
        </TabButton>
      </div>

      {tab === 'employees' && <EmployeesTab />}
      {tab === 'departments' && <DepartmentsTab />}
      {tab === 'admission' && <AdmissionTab />}
      {tab === 'contracts' && <EmployeeContractsTab />}
      {tab === 'termination' && <TerminationTab />}
      {tab === 'vacation' && <VacationTab />}
      {tab === 'absences' && <AbsencesTab />}
      {tab === 'benefits' && <BenefitsTab />}
      {tab === 'trainings' && <TrainingsTab />}
      {tab === 'attendance' && <AttendanceTab />}
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
