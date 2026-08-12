import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Plus, Pencil, CheckCircle2, CalendarRange } from 'lucide-react';

import * as hrApi from '@/api/hr';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { formatDate, toDateInputValue } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { useEmployeeOptions } from '@/components/hr/useEmployeeOptions';
import * as departmentsApi from '@/api/departments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';
import { DidacticAlert } from '@/components/DidacticAlert';

const ACCRUAL_STATUS_LABEL: Record<hrApi.AccrualStatus, string> = {
  em_curso: 'Em curso',
  programado: 'Programado',
  gozado: 'Gozado',
  vencido_dobra: 'Vencido — dobra devida',
  zerado: 'Zerado',
};

const ACCRUAL_STATUS_BADGE: Record<hrApi.AccrualStatus, BadgeProps['variant']> = {
  em_curso: 'secondary',
  programado: 'warning',
  gozado: 'success',
  vencido_dobra: 'destructive',
  zerado: 'outline',
};

const SCHEDULE_STATUS_LABEL: Record<hrApi.ScheduleStatus, string> = {
  planejado: 'Planejado',
  confirmado: 'Confirmado',
  em_gozo: 'Em gozo',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

const SCHEDULE_STATUS_BADGE: Record<hrApi.ScheduleStatus, BadgeProps['variant']> = {
  planejado: 'secondary',
  confirmado: 'warning',
  em_gozo: 'warning',
  concluido: 'success',
  cancelado: 'destructive',
};

type VacationSection = 'periods' | 'schedules' | 'calendar';

/**
 * Aba "Férias" de `/hr` — UC-67 (RF-RH-031 a 043, **P0 — maior risco legal
 * do bloco**). `VacationAccrualPeriod` nunca nasce por criação manual — a
 * abertura é automática na conclusão da admissão (aba Admissão). Aqui:
 * listar/recalcular períodos aquisitivos, programar/revisar/confirmar
 * frações de férias e visualizar o calendário por departamento.
 */
export function VacationTab() {
  const [section, setSection] = React.useState<VacationSection>('periods');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b">
        <SectionButton active={section === 'periods'} onClick={() => setSection('periods')}>
          Períodos aquisitivos
        </SectionButton>
        <SectionButton active={section === 'schedules'} onClick={() => setSection('schedules')}>
          Programações
        </SectionButton>
        <SectionButton active={section === 'calendar'} onClick={() => setSection('calendar')}>
          Calendário
        </SectionButton>
      </div>

      {section === 'periods' && <AccrualPeriodsSection />}
      {section === 'schedules' && <SchedulesSection />}
      {section === 'calendar' && <CalendarSection />}
    </div>
  );
}

function SectionButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={active ? 'rounded-none border-b-2 border-brand text-brand' : 'rounded-none border-b-2 border-transparent'}
    >
      {children}
    </Button>
  );
}

function AccrualPeriodsSection() {
  const { hasModuleAccess } = useAuth();
  const canWrite = hasModuleAccess('rh');
  const queryClient = useQueryClient();
  const { employees, employeeName } = useEmployeeOptions();

  const [employeeFilter, setEmployeeFilter] = React.useState<number | ''>('');
  const [statusFilter, setStatusFilter] = React.useState<hrApi.AccrualStatus | ''>('');
  const [page, setPage] = React.useState(1);
  const [error, setError] = React.useState<DidacticError | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-vacation-accrual-periods', employeeFilter, statusFilter, page],
    queryFn: () =>
      hrApi.listVacationAccrualPeriods({ employee_id: employeeFilter || undefined, status: statusFilter || undefined, page, limit: 20 }),
  });

  const recalculateMutation = useMutation({
    mutationFn: (id: number) => hrApi.recalculateVacationAccrualPeriod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-vacation-accrual-periods'] });
      setError(null);
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível recalcular o período aquisitivo')),
  });

  const colSpan = canWrite ? 7 : 6;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="accrual-employee-filter">Funcionário</Label>
          <SelectNative
            id="accrual-employee-filter"
            className="w-56"
            value={employeeFilter}
            onChange={(event) => {
              setEmployeeFilter(event.target.value ? Number(event.target.value) : '');
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </SelectNative>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="accrual-status-filter">Status</Label>
          <SelectNative
            id="accrual-status-filter"
            className="w-52"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as hrApi.AccrualStatus | '');
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {Object.entries(ACCRUAL_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectNative>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Funcionário</TableHead>
            <TableHead>Período aquisitivo</TableHead>
            <TableHead>Fim concessivo</TableHead>
            <TableHead>Dias de direito</TableHead>
            <TableHead>Dias gozados</TableHead>
            <TableHead>Status</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={colSpan} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-destructive">
                Não foi possível carregar os períodos aquisitivos. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((period) => (
            <TableRow key={period.id}>
              <TableCell className="font-medium">{employeeName(period.employee_id)}</TableCell>
              <TableCell>
                {formatDate(period.period_start)} – {formatDate(period.period_end)}
              </TableCell>
              <TableCell className={period.alert_level === 'critical' ? 'font-medium text-destructive' : undefined}>
                {formatDate(period.concessive_end)}
              </TableCell>
              <TableCell>{period.entitled_days}</TableCell>
              <TableCell>{period.days_taken}</TableCell>
              <TableCell>
                <Badge variant={ACCRUAL_STATUS_BADGE[period.status]}>{ACCRUAL_STATUS_LABEL[period.status]}</Badge>
              </TableCell>
              {canWrite && (
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={recalculateMutation.isPending}
                    onClick={() => recalculateMutation.mutate(period.id)}
                  >
                    <RefreshCw className="size-4" /> Recalcular
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
                Nenhum período aquisitivo encontrado. Períodos nascem automaticamente na conclusão da admissão.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      {error && <DidacticAlert error={error} />}
    </div>
  );
}

function SchedulesSection() {
  const { hasModuleAccess } = useAuth();
  const canWrite = hasModuleAccess('rh');
  const queryClient = useQueryClient();
  const { employees, employeeName } = useEmployeeOptions();

  const [employeeFilter, setEmployeeFilter] = React.useState<number | ''>('');
  const [page, setPage] = React.useState(1);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [revisingSchedule, setRevisingSchedule] = React.useState<hrApi.VacationSchedule | null>(null);
  const [confirmingSchedule, setConfirmingSchedule] = React.useState<hrApi.VacationSchedule | null>(null);
  const [error, setError] = React.useState<DidacticError | null>(null);

  const { data: periods } = useQuery({
    queryKey: ['hr-vacation-accrual-periods-all', employeeFilter],
    queryFn: () => hrApi.listVacationAccrualPeriods({ employee_id: employeeFilter || undefined, limit: 100 }),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-vacation-schedules', employeeFilter, page],
    queryFn: () => hrApi.listVacationSchedules({ employee_id: employeeFilter || undefined, page, limit: 20 }),
  });

  const confirmMutation = useMutation({
    mutationFn: ({ id, days }: { id: number; days?: number }) => hrApi.confirmVacationTaken(id, days),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-vacation-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['hr-vacation-accrual-periods'] });
      setConfirmingSchedule(null);
      setError(null);
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível confirmar o gozo de férias')),
  });

  const colSpan = canWrite ? 6 : 5;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="schedule-employee-filter">Funcionário</Label>
          <SelectNative
            id="schedule-employee-filter"
            className="w-56"
            value={employeeFilter}
            onChange={(event) => {
              setEmployeeFilter(event.target.value ? Number(event.target.value) : '');
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </SelectNative>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)} disabled={!periods?.data.length}>
            <Plus /> Programar férias
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Funcionário</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>Dias</TableHead>
            <TableHead>Abono</TableHead>
            <TableHead>Status</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={colSpan} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-destructive">
                Não foi possível carregar as programações de férias. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((schedule) => (
            <TableRow key={schedule.id}>
              <TableCell className="font-medium">
                {schedule.accrualPeriod?.employee?.name ?? employeeName(schedule.accrualPeriod?.employee_id)}
              </TableCell>
              <TableCell>{formatDate(schedule.start_date)}</TableCell>
              <TableCell>{schedule.days}</TableCell>
              <TableCell>{schedule.abono ? `Sim (${schedule.abono_days ?? '-'} dias)` : 'Não'}</TableCell>
              <TableCell>
                <Badge variant={SCHEDULE_STATUS_BADGE[schedule.status]}>{SCHEDULE_STATUS_LABEL[schedule.status]}</Badge>
              </TableCell>
              {canWrite && (
                <TableCell className="flex flex-wrap gap-1.5">
                  {(schedule.status === 'planejado' || schedule.status === 'confirmado') && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setRevisingSchedule(schedule)}>
                        <Pencil className="size-4" /> Revisar
                      </Button>
                      <Button size="sm" onClick={() => setConfirmingSchedule(schedule)}>
                        <CheckCircle2 className="size-4" /> Confirmar gozo
                      </Button>
                    </>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
                Nenhuma programação de férias encontrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      {error && <DidacticAlert error={error} />}

      <CreateScheduleDialog
        open={createOpen}
        periods={periods?.data ?? []}
        employeeName={employeeName}
        onClose={() => setCreateOpen(false)}
      />
      <ReviseScheduleDialog schedule={revisingSchedule} onClose={() => setRevisingSchedule(null)} />

      <Dialog open={Boolean(confirmingSchedule)} onOpenChange={(next) => !next && setConfirmingSchedule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar gozo efetivo de férias</DialogTitle>
            <DialogDescription>
              Registra os dias efetivamente gozados. Deixe em branco para confirmar os {confirmingSchedule?.days} dias
              programados.
            </DialogDescription>
          </DialogHeader>
          <ConfirmTakenForm
            schedule={confirmingSchedule}
            isPending={confirmMutation.isPending}
            onCancel={() => setConfirmingSchedule(null)}
            onConfirm={(days) => confirmMutation.mutate({ id: confirmingSchedule!.id, days })}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConfirmTakenForm({
  schedule,
  isPending,
  onCancel,
  onConfirm,
}: {
  schedule: hrApi.VacationSchedule | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: (days?: number) => void;
}) {
  const [days, setDays] = React.useState('');

  React.useEffect(() => {
    if (schedule) setDays('');
  }, [schedule]);

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-days-taken">Dias gozados (opcional)</Label>
        <Input id="confirm-days-taken" type="number" min="1" max="30" value={days} onChange={(event) => setDays(event.target.value)} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="button" onClick={() => onConfirm(days ? Number(days) : undefined)} disabled={isPending}>
          {isPending ? 'Confirmando...' : 'Confirmar gozo'}
        </Button>
      </DialogFooter>
    </>
  );
}

interface ScheduleFormState {
  start_date: string;
  days: string;
  abono: boolean;
  abono_days: string;
  aviso_em: string;
  employee_agreement_confirmed: boolean;
  override_team_limit_justification: string;
}

const EMPTY_SCHEDULE_FORM: ScheduleFormState = {
  start_date: '',
  days: '',
  abono: false,
  abono_days: '',
  aviso_em: toDateInputValue(),
  employee_agreement_confirmed: false,
  override_team_limit_justification: '',
};

function ScheduleFormFields({ form, onChange }: { form: ScheduleFormState; onChange: (form: ScheduleFormState) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="schedule-start-date">Início *</Label>
          <Input
            id="schedule-start-date"
            type="date"
            value={form.start_date}
            onChange={(event) => onChange({ ...form, start_date: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="schedule-days">Dias *</Label>
          <Input
            id="schedule-days"
            type="number"
            min="1"
            max="30"
            value={form.days}
            onChange={(event) => onChange({ ...form, days: event.target.value })}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="schedule-aviso-em">Comunicado ao funcionário em</Label>
        <Input
          id="schedule-aviso-em"
          type="date"
          value={form.aviso_em}
          onChange={(event) => onChange({ ...form, aviso_em: event.target.value })}
        />
        <p className="text-xs text-muted-foreground">Antecedência recomendada de 30 dias (Art. 135, CLT) — menor que isso é aceito com justificativa.</p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4"
          checked={form.employee_agreement_confirmed}
          onChange={(event) => onChange({ ...form, employee_agreement_confirmed: event.target.checked })}
        />
        Funcionário concorda com o fracionamento
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4" checked={form.abono} onChange={(event) => onChange({ ...form, abono: event.target.checked })} />
        Inclui abono pecuniário (limite de 1/3 do período — Art. 143, CLT)
      </label>
      {form.abono && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="schedule-abono-days">Dias de abono *</Label>
          <Input
            id="schedule-abono-days"
            type="number"
            min="1"
            max="10"
            value={form.abono_days}
            onChange={(event) => onChange({ ...form, abono_days: event.target.value })}
          />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="schedule-team-limit-justification">Justificativa de limite de equipe (se avisado pelo sistema)</Label>
        <textarea
          id="schedule-team-limit-justification"
          className="flex min-h-14 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={form.override_team_limit_justification}
          onChange={(event) => onChange({ ...form, override_team_limit_justification: event.target.value })}
        />
      </div>
    </div>
  );
}

function scheduleFieldsFromForm(form: ScheduleFormState): hrApi.VacationScheduleFields {
  return {
    start_date: form.start_date,
    days: Number(form.days),
    abono: form.abono || undefined,
    abono_days: form.abono && form.abono_days ? Number(form.abono_days) : undefined,
    aviso_em: form.aviso_em || undefined,
    employee_agreement_confirmed: form.employee_agreement_confirmed || undefined,
    override_team_limit_justification: form.override_team_limit_justification.trim() || undefined,
  };
}

function CreateScheduleDialog({
  open,
  periods,
  employeeName,
  onClose,
}: {
  open: boolean;
  periods: hrApi.VacationAccrualPeriod[];
  employeeName: (id: number | null | undefined) => string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [accrualPeriodId, setAccrualPeriodId] = React.useState<number | ''>('');
  const [form, setForm] = React.useState<ScheduleFormState>(EMPTY_SCHEDULE_FORM);
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setAccrualPeriodId('');
      setForm(EMPTY_SCHEDULE_FORM);
      setError(null);
      setValidationError(null);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => hrApi.createVacationSchedule({ accrual_period_id: Number(accrualPeriodId), ...scheduleFieldsFromForm(form) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-vacation-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['hr-vacation-accrual-periods'] });
      onClose();
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível programar a fração de férias')),
  });

  const handleConfirm = () => {
    if (!accrualPeriodId || !form.start_date || !form.days) {
      setValidationError('Selecione o período aquisitivo e informe início/dias.');
      return;
    }
    setValidationError(null);
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Programar férias</DialogTitle>
          <DialogDescription>Máximo de 3 frações por período; se fracionado, ao menos uma fração deve ter 14+ dias e nenhuma menos de 5 (Art. 134 §1º, CLT).</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="schedule-accrual-period">Período aquisitivo *</Label>
            <SelectNative
              id="schedule-accrual-period"
              value={accrualPeriodId}
              onChange={(event) => setAccrualPeriodId(event.target.value ? Number(event.target.value) : '')}
            >
              <option value="">Selecione...</option>
              {periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {employeeName(period.employee_id)} — {formatDate(period.period_start)} a {formatDate(period.period_end)} ({period.entitled_days} dias)
                </option>
              ))}
            </SelectNative>
          </div>
          <ScheduleFormFields form={form} onChange={setForm} />
          {validationError && <p className="text-sm text-destructive">{validationError}</p>}
        </div>
        {error && <DidacticAlert error={error} />}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : 'Programar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviseScheduleDialog({ schedule, onClose }: { schedule: hrApi.VacationSchedule | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = React.useState('');
  const [form, setForm] = React.useState<ScheduleFormState>(EMPTY_SCHEDULE_FORM);
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (schedule) {
      setReason('');
      setForm({
        start_date: schedule.start_date,
        days: String(schedule.days),
        abono: schedule.abono,
        abono_days: schedule.abono_days ? String(schedule.abono_days) : '',
        aviso_em: schedule.notice_sent_at ?? toDateInputValue(),
        employee_agreement_confirmed: schedule.employee_agreement_confirmed,
        override_team_limit_justification: '',
      });
      setError(null);
      setValidationError(null);
    }
  }, [schedule]);

  const mutation = useMutation({
    mutationFn: () => hrApi.reviseVacationSchedule(schedule!.id, { reason, ...scheduleFieldsFromForm(form) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-vacation-schedules'] });
      onClose();
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível revisar a programação de férias')),
  });

  const handleConfirm = () => {
    if (!reason.trim() || !form.start_date || !form.days) {
      setValidationError('Informe o motivo da revisão e os novos dados.');
      return;
    }
    setValidationError(null);
    mutation.mutate();
  };

  return (
    <Dialog open={Boolean(schedule)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar programação de férias</DialogTitle>
          <DialogDescription>Gera um novo registro vinculado ao anterior (`superseded_by_id`) — a programação original nunca é sobrescrita (RF-RH-040).</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="revise-reason">Motivo da revisão *</Label>
            <textarea
              id="revise-reason"
              className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <ScheduleFormFields form={form} onChange={setForm} />
          {validationError && <p className="text-sm text-destructive">{validationError}</p>}
        </div>
        {error && <DidacticAlert error={error} />}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : 'Salvar revisão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CalendarSection() {
  const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: departmentsApi.listDepartments });
  const [departmentId, setDepartmentId] = React.useState<number | ''>('');
  const today = toDateInputValue();
  const [from, setFrom] = React.useState(today);
  const [to, setTo] = React.useState(today);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-vacation-calendar', departmentId, from, to],
    queryFn: () => hrApi.getVacationCalendar({ department_id: departmentId || undefined, from, to }),
    enabled: Boolean(from && to),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="calendar-department">Departamento</Label>
          <SelectNative
            id="calendar-department"
            className="w-56"
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value ? Number(event.target.value) : '')}
          >
            <option value="">Todos (sem % de equipe)</option>
            {departments?.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </SelectNative>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="calendar-from">De</Label>
          <Input id="calendar-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="calendar-to">Até</Label>
          <Input id="calendar-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {isError && <p className="text-sm text-destructive">Não foi possível carregar o calendário de férias.</p>}

      {data && (
        <div className="flex flex-col gap-3">
          {data.department_id !== null && (
            <div className="flex items-center gap-3 rounded-md border p-3 text-sm">
              <CalendarRange className="size-4 text-muted-foreground" />
              <span>
                {data.schedules.length} funcionário(s) em férias no período — {data.department_active_headcount} ativos no
                departamento (
                {data.simultaneous_percent !== null ? `${(data.simultaneous_percent * 100).toFixed(0)}%` : '-'} simultâneos,
                limite {(data.team_limit_percent * 100).toFixed(0)}%)
              </span>
              {data.team_limit_exceeded && <Badge variant="destructive">Limite de equipe excedido</Badge>}
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionário</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Dias</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.schedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell>{schedule.accrualPeriod?.employee?.name ?? '-'}</TableCell>
                  <TableCell>{formatDate(schedule.start_date)}</TableCell>
                  <TableCell>{schedule.days}</TableCell>
                  <TableCell>
                    <Badge variant={SCHEDULE_STATUS_BADGE[schedule.status]}>{SCHEDULE_STATUS_LABEL[schedule.status]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {data.schedules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhuma programação de férias no período.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
