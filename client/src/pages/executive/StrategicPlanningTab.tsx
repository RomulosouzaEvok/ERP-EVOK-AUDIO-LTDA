import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Target, TrendingUp } from 'lucide-react';

import * as directorateApi from '@/api/directorate';
import * as departmentsApi from '@/api/departments';
import { useAuth } from '@/context/AuthContext';
import { useEmployeeOptions } from '@/components/hr/useEmployeeOptions';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';
import { DidacticAlert } from '@/components/DidacticAlert';

const STATUS_LABEL: Record<directorateApi.StrategicPlanningStatus, string> = {
  not_started: 'Não iniciado',
  in_progress: 'Em andamento',
  achieved: 'Atingido',
  not_achieved: 'Não atingido',
};

const STATUS_BADGE: Record<directorateApi.StrategicPlanningStatus, 'secondary' | 'default' | 'success' | 'destructive'> = {
  not_started: 'secondary',
  in_progress: 'default',
  achieved: 'success',
  not_achieved: 'destructive',
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, index) => CURRENT_YEAR - 2 + index);

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** `target_value`/`actual_value` como percentual simples (sem lib de gráfico), 0–100+, capado visualmente em 100. */
function achievementPercent(planning: directorateApi.StrategicPlanning): number | null {
  const target = toNumber(planning.target_value);
  const actual = toNumber(planning.actual_value);
  if (target === null || target === 0 || actual === null) return null;
  return (actual / target) * 100;
}

/**
 * Aba "Planejamento Estratégico" de `/directorate` —
 * `/api/directorate/strategic-plannings`. Leitura exige módulo `diretoria`;
 * escrita (criar/editar/registrar realizado) exige `diretoria:approve`.
 */
export function StrategicPlanningTab() {
  const { hasRole, permissions } = useAuth();
  const canWrite = hasRole('admin') || permissions?.diretoria === 'approve';
  const queryClient = useQueryClient();
  const { employees, employeeName } = useEmployeeOptions();

  const { data: departmentsData } = useQuery({ queryKey: ['departments-all'], queryFn: departmentsApi.listDepartments });
  const { data: orgChart } = useQuery({ queryKey: ['directorate-org-chart'], queryFn: directorateApi.getOrgChart });
  const directorateOptions = orgChart?.directorates ?? [];
  const departmentOptions = departmentsData ?? [];

  const [yearFilter, setYearFilter] = React.useState<number | ''>('');
  const [directorateFilter, setDirectorateFilter] = React.useState<number | ''>('');
  const [departmentFilter, setDepartmentFilter] = React.useState<number | ''>('');
  const [statusFilter, setStatusFilter] = React.useState<directorateApi.StrategicPlanningStatus | ''>('');
  const [page, setPage] = React.useState(1);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<directorateApi.StrategicPlanning | null>(null);
  const [actualDialog, setActualDialog] = React.useState<directorateApi.StrategicPlanning | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['directorate-strategic-plannings', yearFilter, directorateFilter, departmentFilter, statusFilter, page],
    queryFn: () =>
      directorateApi.listStrategicPlannings({
        year: yearFilter || undefined,
        directorate_id: directorateFilter || undefined,
        department_id: departmentFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: 20,
      }),
  });

  const directorateName = (id: number | null) => directorateOptions.find((d) => d.id === id)?.name ?? `#${id}`;
  const departmentName = (id: number | null) => departmentOptions.find((d) => d.id === id)?.name ?? `#${id}`;

  const colSpan = canWrite ? 8 : 7;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sp-year-filter">Ano</Label>
            <SelectNative
              id="sp-year-filter"
              className="w-28"
              value={yearFilter}
              onChange={(event) => {
                setYearFilter(event.target.value ? Number(event.target.value) : '');
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sp-directorate-filter">Diretoria</Label>
            <SelectNative
              id="sp-directorate-filter"
              className="w-48"
              value={directorateFilter}
              onChange={(event) => {
                setDirectorateFilter(event.target.value ? Number(event.target.value) : '');
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              {directorateOptions.map((directorate) => (
                <option key={directorate.id} value={directorate.id}>
                  {directorate.name}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sp-department-filter">Departamento</Label>
            <SelectNative
              id="sp-department-filter"
              className="w-48"
              value={departmentFilter}
              onChange={(event) => {
                setDepartmentFilter(event.target.value ? Number(event.target.value) : '');
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {departmentOptions.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sp-status-filter">Status</Label>
            <SelectNative
              id="sp-status-filter"
              className="w-40"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as directorateApi.StrategicPlanningStatus | '');
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectNative>
          </div>
        </div>
        {canWrite && (
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus /> Novo objetivo
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ano</TableHead>
            <TableHead>Objetivo</TableHead>
            <TableHead>Dono</TableHead>
            <TableHead>KPI</TableHead>
            <TableHead>Meta × Realizado</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Responsável</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={colSpan} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-destructive">
                Não foi possível carregar o planejamento estratégico. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((planning) => {
            const percent = achievementPercent(planning);
            return (
              <TableRow key={planning.id}>
                <TableCell>{planning.year}</TableCell>
                <TableCell className="max-w-72 font-medium">{planning.objective}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {planning.directorate_id
                    ? directorateName(planning.directorate_id)
                    : planning.department_id
                      ? departmentName(planning.department_id)
                      : 'Empresa toda'}
                </TableCell>
                <TableCell className="text-sm">{planning.kpi ?? '—'}</TableCell>
                <TableCell className="min-w-40">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{planning.target_value ?? '—'}</span>
                    <span>{planning.actual_value ?? '—'}</span>
                  </div>
                  <Progress value={percent === null ? 0 : Math.min(100, Math.max(0, percent))} className={percent === null ? 'opacity-30' : undefined} />
                  {percent !== null && <p className="mt-0.5 text-right text-[11px] text-muted-foreground">{percent.toFixed(0)}%</p>}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE[planning.status]}>{STATUS_LABEL[planning.status]}</Badge>
                </TableCell>
                <TableCell className="text-sm">{employeeName(planning.responsible_id)}</TableCell>
                {canWrite && (
                  <TableCell className="flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(planning);
                        setFormOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setActualDialog(planning)}>
                      <TrendingUp className="size-4" /> Realizado
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
                <Target className="mx-auto mb-1 size-5 opacity-40" />
                Nenhum objetivo estratégico encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <PlanningFormDialog
        open={formOpen}
        planning={editing}
        directorateOptions={directorateOptions}
        departmentOptions={departmentOptions}
        employees={employees}
        onClose={() => setFormOpen(false)}
      />
      <ActualValueDialog
        planning={actualDialog}
        onClose={() => setActualDialog(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['directorate-strategic-plannings'] })}
      />
    </div>
  );
}

function PlanningFormDialog({
  open,
  planning,
  directorateOptions,
  departmentOptions,
  employees,
  onClose,
}: {
  open: boolean;
  planning: directorateApi.StrategicPlanning | null;
  directorateOptions: directorateApi.OrgChartDirectorate[];
  departmentOptions: departmentsApi.Department[];
  employees: { id: number; name: string }[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(planning);

  type OwnerKind = 'company' | 'directorate' | 'department';

  const [year, setYear] = React.useState<number>(CURRENT_YEAR);
  const [objective, setObjective] = React.useState('');
  const [ownerKind, setOwnerKind] = React.useState<OwnerKind>('company');
  const [directorateId, setDirectorateId] = React.useState<number | ''>('');
  const [departmentId, setDepartmentId] = React.useState<number | ''>('');
  const [kpi, setKpi] = React.useState('');
  const [targetValue, setTargetValue] = React.useState('');
  const [weight, setWeight] = React.useState('');
  const [status, setStatus] = React.useState<directorateApi.StrategicPlanningStatus>('not_started');
  const [responsibleId, setResponsibleId] = React.useState<number | ''>('');
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    if (planning) {
      setYear(planning.year);
      setObjective(planning.objective);
      setOwnerKind(planning.directorate_id ? 'directorate' : planning.department_id ? 'department' : 'company');
      setDirectorateId(planning.directorate_id ?? '');
      setDepartmentId(planning.department_id ?? '');
      setKpi(planning.kpi ?? '');
      setTargetValue(planning.target_value ?? '');
      setWeight(planning.weight ?? '');
      setStatus(planning.status);
      setResponsibleId(planning.responsible_id ?? '');
    } else {
      setYear(CURRENT_YEAR);
      setObjective('');
      setOwnerKind('company');
      setDirectorateId('');
      setDepartmentId('');
      setKpi('');
      setTargetValue('');
      setWeight('');
      setStatus('not_started');
      setResponsibleId('');
    }
    setError(null);
    setValidationError(null);
  }, [open, planning]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload: directorateApi.StrategicPlanningInput = {
        year,
        objective: objective.trim(),
        directorate_id: ownerKind === 'directorate' ? Number(directorateId) : null,
        department_id: ownerKind === 'department' ? Number(departmentId) : null,
        kpi: kpi.trim() || null,
        target_value: targetValue === '' ? null : Number(targetValue),
        weight: weight === '' ? null : Number(weight),
        status,
        responsible_id: responsibleId === '' ? null : Number(responsibleId),
      };
      return isEdit ? directorateApi.updateStrategicPlanning(planning!.id, payload) : directorateApi.createStrategicPlanning(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directorate-strategic-plannings'] });
      onClose();
    },
    onError: (err) => setError(translateApiError(err, isEdit ? 'Não foi possível atualizar o objetivo' : 'Não foi possível criar o objetivo')),
  });

  const handleConfirm = () => {
    if (!objective.trim()) {
      setValidationError('Informe o objetivo.');
      return;
    }
    if (ownerKind === 'directorate' && !directorateId) {
      setValidationError('Selecione a diretoria dona do objetivo.');
      return;
    }
    if (ownerKind === 'department' && !departmentId) {
      setValidationError('Selecione o departamento dono do objetivo.');
      return;
    }
    setValidationError(null);
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar objetivo estratégico' : 'Novo objetivo estratégico'}</DialogTitle>
          <DialogDescription>O dono do objetivo é a empresa toda, uma diretoria OU um departamento — nunca dois ao mesmo tempo.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sp-form-year">Ano *</Label>
              <SelectNative id="sp-form-year" value={year} onChange={(event) => setYear(Number(event.target.value))}>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sp-form-status">Status</Label>
              <SelectNative id="sp-form-status" value={status} onChange={(event) => setStatus(event.target.value as directorateApi.StrategicPlanningStatus)}>
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sp-form-objective">Objetivo *</Label>
            <textarea
              id="sp-form-objective"
              className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
              maxLength={2000}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sp-form-owner-kind">Dono do objetivo</Label>
            <SelectNative
              id="sp-form-owner-kind"
              value={ownerKind}
              onChange={(event) => setOwnerKind(event.target.value as OwnerKind)}
            >
              <option value="company">Empresa toda</option>
              <option value="directorate">Uma diretoria</option>
              <option value="department">Um departamento</option>
            </SelectNative>
          </div>
          {ownerKind === 'directorate' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sp-form-directorate">Diretoria *</Label>
              <SelectNative id="sp-form-directorate" value={directorateId} onChange={(event) => setDirectorateId(event.target.value ? Number(event.target.value) : '')}>
                <option value="">Selecione...</option>
                {directorateOptions.map((directorate) => (
                  <option key={directorate.id} value={directorate.id}>
                    {directorate.name}
                  </option>
                ))}
              </SelectNative>
            </div>
          )}
          {ownerKind === 'department' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sp-form-department">Departamento *</Label>
              <SelectNative id="sp-form-department" value={departmentId} onChange={(event) => setDepartmentId(event.target.value ? Number(event.target.value) : '')}>
                <option value="">Selecione...</option>
                {departmentOptions.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </SelectNative>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sp-form-kpi">KPI</Label>
              <Input id="sp-form-kpi" value={kpi} onChange={(event) => setKpi(event.target.value)} maxLength={200} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sp-form-target">Meta</Label>
              <Input id="sp-form-target" type="number" step="any" value={targetValue} onChange={(event) => setTargetValue(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sp-form-weight">Peso (%)</Label>
              <Input id="sp-form-weight" type="number" step="any" min={0} max={100} value={weight} onChange={(event) => setWeight(event.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sp-form-responsible">Responsável</Label>
            <SelectNative id="sp-form-responsible" value={responsibleId} onChange={(event) => setResponsibleId(event.target.value ? Number(event.target.value) : '')}>
              <option value="">Não definido</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </SelectNative>
          </div>
          {validationError && <p className="text-sm text-destructive">{validationError}</p>}
        </div>
        {error && <DidacticAlert error={error} />}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActualValueDialog({
  planning,
  onClose,
  onSuccess,
}: {
  planning: directorateApi.StrategicPlanning | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [actualValue, setActualValue] = React.useState('');
  const [error, setError] = React.useState<DidacticError | null>(null);

  React.useEffect(() => {
    if (planning) {
      setActualValue(planning.actual_value ?? '');
      setError(null);
    }
  }, [planning]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!planning) throw new Error('Objetivo não selecionado');
      return directorateApi.updateStrategicPlanningActual(planning.id, Number(actualValue));
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível registrar o realizado')),
  });

  return (
    <Dialog open={Boolean(planning)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar realizado</DialogTitle>
          <DialogDescription>{planning?.objective}. Meta: {planning?.target_value ?? '—'}. O status é recalculado pelo servidor.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sp-actual-value">Valor realizado *</Label>
          <Input id="sp-actual-value" type="number" step="any" value={actualValue} onChange={(event) => setActualValue(event.target.value)} />
        </div>
        {error && <DidacticAlert error={error} />}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (actualValue === '') {
                setError({ title: 'Informe o valor realizado', reasons: ['O campo é obrigatório.'] });
                return;
              }
              mutation.mutate();
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Salvando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
