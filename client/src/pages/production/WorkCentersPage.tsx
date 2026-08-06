import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Pencil, Clock, Gauge } from 'lucide-react';

import * as workCentersApi from '@/api/workCenters';
import { extractApiErrorMessage } from '@/api/httpClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';

const WEEKDAY_LABEL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatRate(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${(toNumber(value) * 100).toFixed(1).replace('.', ',')}%`;
}

function utilizationTone(rate: number | null): string {
  if (rate === null) return 'bg-muted-foreground/40';
  if (rate > 1) return 'bg-destructive';
  if (rate >= 0.8) return 'bg-amber-500';
  return 'bg-success';
}

/** Barra de utilização proporcional (0–100%, capada visualmente em 100%). */
function UtilizationBar({ rate }: { rate: number | null }) {
  const pct = rate === null ? 0 : Math.min(rate * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${utilizationTone(rate)}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium tabular-nums">{formatRate(rate)}</span>
    </div>
  );
}

const workCenterSchema = z.object({
  code: z.string().min(1, 'Informe o código.').max(30),
  name: z.string().min(1, 'Informe o nome.').max(100),
  description: z.string().max(2000).optional(),
  machines_count: z.coerce.number().int('Deve ser inteiro.').min(1, 'Mínimo 1.'),
  capacity_hours_per_day: z.coerce.number().gt(0, 'Deve ser maior que zero.').lte(24, 'Máximo 24h.'),
  efficiency_factor: z.coerce.number().gt(0, 'Deve ser maior que zero.').lte(1, 'Máximo 1 (100%).'),
  active: z.boolean().optional(),
});

type WorkCenterFormData = z.infer<typeof workCenterSchema>;

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const shiftFormSchema = z.object({
  shifts: z.array(
    z.object({
      weekday: z.coerce.number().int().min(0).max(6),
      start_time: z.string().regex(timeRegex, 'Formato HH:MM.'),
      end_time: z.string().regex(timeRegex, 'Formato HH:MM.'),
    }),
  ),
});

type ShiftFormData = z.infer<typeof shiftFormSchema>;

const DEFAULT_WORK_CENTER_VALUES: WorkCenterFormData = {
  code: '',
  name: '',
  description: '',
  machines_count: 1,
  capacity_hours_per_day: 8,
  efficiency_factor: 1,
  active: true,
};

/** Formulário de criação/edição de centro de trabalho (dialog compartilhado). */
function WorkCenterFormDialog({
  open,
  onOpenChange,
  workCenter,
  onSubmit,
  isPending,
  submitError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workCenter: workCentersApi.WorkCenter | null;
  onSubmit: (values: WorkCenterFormData) => void;
  isPending: boolean;
  submitError: string | null;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WorkCenterFormData>({
    resolver: zodResolver(workCenterSchema),
    defaultValues: DEFAULT_WORK_CENTER_VALUES,
  });

  React.useEffect(() => {
    if (!open) return;
    reset(
      workCenter
        ? {
            code: workCenter.code,
            name: workCenter.name,
            description: workCenter.description ?? '',
            machines_count: workCenter.machines_count,
            capacity_hours_per_day: toNumber(workCenter.capacity_hours_per_day),
            efficiency_factor: toNumber(workCenter.efficiency_factor),
            active: workCenter.active,
          }
        : DEFAULT_WORK_CENTER_VALUES,
    );
  }, [open, workCenter, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{workCenter ? 'Editar centro de trabalho' : 'Novo centro de trabalho'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wc-code">Código</Label>
              <Input id="wc-code" {...register('code')} />
              {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wc-name">Nome</Label>
              <Input id="wc-name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wc-description">Descrição</Label>
            <Input id="wc-description" {...register('description')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wc-machines">Máquinas</Label>
              <Input id="wc-machines" type="number" step="1" min="1" {...register('machines_count')} />
              {errors.machines_count && <p className="text-sm text-destructive">{errors.machines_count.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wc-capacity">Capacidade (h/dia)</Label>
              <Input id="wc-capacity" type="number" step="any" min="0" max="24" {...register('capacity_hours_per_day')} />
              {errors.capacity_hours_per_day && (
                <p className="text-sm text-destructive">{errors.capacity_hours_per_day.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wc-efficiency">Eficiência (0–1)</Label>
              <Input id="wc-efficiency" type="number" step="any" min="0" max="1" {...register('efficiency_factor')} />
              {errors.efficiency_factor && (
                <p className="text-sm text-destructive">{errors.efficiency_factor.message}</p>
              )}
            </div>
          </div>
          {workCenter && (
            <div className="flex items-center gap-2">
              <input id="wc-active" type="checkbox" {...register('active')} />
              <Label htmlFor="wc-active">Ativo</Label>
            </div>
          )}
          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : workCenter ? 'Salvar alterações' : 'Criar centro de trabalho'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Dialog de gestão de turnos de um centro de trabalho (substitui todos ao salvar). */
function ShiftsDialog({
  open,
  onOpenChange,
  workCenter,
  onSubmit,
  isPending,
  submitError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workCenter: workCentersApi.WorkCenter | null;
  onSubmit: (shifts: workCentersApi.ShiftInput[]) => void;
  isPending: boolean;
  submitError: string | null;
}) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: { shifts: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'shifts' });

  React.useEffect(() => {
    if (!open) return;
    reset({
      shifts: (workCenter?.shifts ?? []).map((shift) => ({
        weekday: shift.weekday,
        start_time: shift.start_time.slice(0, 5),
        end_time: shift.end_time.slice(0, 5),
      })),
    });
  }, [open, workCenter, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Turnos — {workCenter?.code}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={handleSubmit((values) => onSubmit(values.shifts))}
          noValidate
        >
          <div className="flex flex-col gap-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2">
                <div className="w-40">
                  <Label className="mb-1.5 block text-xs">Dia da semana</Label>
                  <Controller
                    control={control}
                    name={`shifts.${index}.weekday`}
                    render={({ field: controllerField }) => (
                      <SelectNative
                        value={controllerField.value}
                        onChange={(event) => controllerField.onChange(Number(event.target.value))}
                      >
                        {WEEKDAY_LABEL.map((label, weekday) => (
                          <option key={weekday} value={weekday}>
                            {label}
                          </option>
                        ))}
                      </SelectNative>
                    )}
                  />
                </div>
                <div className="w-28">
                  <Label className="mb-1.5 block text-xs">Início</Label>
                  <Controller
                    control={control}
                    name={`shifts.${index}.start_time`}
                    render={({ field: controllerField }) => <Input type="time" {...controllerField} />}
                  />
                  {errors.shifts?.[index]?.start_time && (
                    <p className="text-xs text-destructive">{errors.shifts[index]?.start_time?.message}</p>
                  )}
                </div>
                <div className="w-28">
                  <Label className="mb-1.5 block text-xs">Fim</Label>
                  <Controller
                    control={control}
                    name={`shifts.${index}.end_time`}
                    render={({ field: controllerField }) => <Input type="time" {...controllerField} />}
                  />
                  {errors.shifts?.[index]?.end_time && (
                    <p className="text-xs text-destructive">{errors.shifts[index]?.end_time?.message}</p>
                  )}
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => append({ weekday: 1, start_time: '08:00', end_time: '17:00' })}
            >
              <Plus className="size-3" /> Adicionar turno
            </Button>
          </div>
          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : 'Salvar turnos'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Carga-máquina + CRUD de centros de trabalho e seus turnos. */
export default function WorkCentersPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();

  const [horizonDays, setHorizonDays] = React.useState(7);
  const [formOpen, setFormOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [editingWorkCenter, setEditingWorkCenter] = React.useState<workCentersApi.WorkCenter | null>(null);
  const [shiftsOpen, setShiftsOpen] = React.useState(false);
  const [shiftsError, setShiftsError] = React.useState<string | null>(null);
  const [shiftsWorkCenter, setShiftsWorkCenter] = React.useState<workCentersApi.WorkCenter | null>(null);

  const loadQuery = useQuery({
    queryKey: ['work-centers-load', horizonDays],
    queryFn: () => workCentersApi.getWorkCenterLoad(horizonDays),
  });

  const listQuery = useQuery({
    queryKey: ['work-centers'],
    queryFn: () => workCentersApi.listWorkCenters({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: workCentersApi.createWorkCenter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-centers'] });
      queryClient.invalidateQueries({ queryKey: ['work-centers-load'] });
      setFormOpen(false);
      setFormError(null);
    },
    onError: (error) => setFormError(extractApiErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number | string; input: workCentersApi.UpdateWorkCenterInput }) =>
      workCentersApi.updateWorkCenter(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-centers'] });
      queryClient.invalidateQueries({ queryKey: ['work-centers-load'] });
      setFormOpen(false);
      setFormError(null);
    },
    onError: (error) => setFormError(extractApiErrorMessage(error)),
  });

  const shiftsMutation = useMutation({
    mutationFn: ({ id, shifts }: { id: number | string; shifts: workCentersApi.ShiftInput[] }) =>
      workCentersApi.replaceWorkCenterShifts(id, shifts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-centers'] });
      queryClient.invalidateQueries({ queryKey: ['work-centers-load'] });
      setShiftsOpen(false);
      setShiftsError(null);
    },
    onError: (error) => setShiftsError(extractApiErrorMessage(error)),
  });

  function openCreateForm() {
    setEditingWorkCenter(null);
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm(workCenter: workCentersApi.WorkCenter) {
    setEditingWorkCenter(workCenter);
    setFormError(null);
    setFormOpen(true);
  }

  function openShiftsDialog(workCenter: workCentersApi.WorkCenter) {
    setShiftsWorkCenter(workCenter);
    setShiftsError(null);
    setShiftsOpen(true);
  }

  function handleFormSubmit(values: WorkCenterFormData) {
    if (editingWorkCenter) {
      updateMutation.mutate({ id: editingWorkCenter.id, input: values });
    } else {
      createMutation.mutate({
        code: values.code,
        name: values.name,
        description: values.description,
        machines_count: values.machines_count,
        capacity_hours_per_day: values.capacity_hours_per_day,
        efficiency_factor: values.efficiency_factor,
      });
    }
  }

  const load = loadQuery.data;
  const workCenters = listQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Gauge className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Centros de Trabalho</h1>
          <p className="text-sm text-muted-foreground">Capacidade, turnos e carga-máquina por centro de trabalho.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Carga-máquina (próximos {horizonDays} dias)</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="horizon" className="text-xs">Horizonte</Label>
            <SelectNative
              id="horizon"
              value={horizonDays}
              onChange={(event) => setHorizonDays(Number(event.target.value))}
              className="w-28"
            >
              <option value={7}>7 dias</option>
              <option value={14}>14 dias</option>
              <option value={30}>30 dias</option>
            </SelectNative>
          </div>
        </CardHeader>
        <CardContent>
          {loadQuery.isError && (
            <p className="text-sm text-destructive">
              {extractApiErrorMessage(loadQuery.error, 'Falha ao carregar a carga-máquina.')}
            </p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Centro</TableHead>
                <TableHead className="text-right">Máquinas</TableHead>
                <TableHead className="text-right">Capacidade (h)</TableHead>
                <TableHead className="text-right">Carga (h)</TableHead>
                <TableHead>Utilização</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadQuery.isLoading ? (
                <TableSkeletonRows rows={3} columns={5} />
              ) : !load || load.centers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum centro de trabalho ativo.
                  </TableCell>
                </TableRow>
              ) : (
                load.centers.map((center) => (
                  <TableRow key={String(center.id)} className="hover:bg-accent/50">
                    <TableCell className="font-medium">{center.code} — {center.name}</TableCell>
                    <TableCell className="text-right">{center.machines_count}</TableCell>
                    <TableCell className="text-right">{center.capacity_hours.toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right">{center.load_hours.toLocaleString('pt-BR')}</TableCell>
                    <TableCell>
                      <UtilizationBar rate={center.utilization_rate} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Centros de trabalho</CardTitle>
          {canWrite && (
            <Dialog open={formOpen && !editingWorkCenter} onOpenChange={(open) => (open ? openCreateForm() : setFormOpen(false))}>
              <DialogTrigger asChild>
                <Button onClick={openCreateForm}>
                  <Plus className="size-4" /> Novo centro de trabalho
                </Button>
              </DialogTrigger>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {listQuery.isError && (
            <p className="text-sm text-destructive">
              {extractApiErrorMessage(listQuery.error, 'Falha ao carregar os centros de trabalho.')}
            </p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Máquinas</TableHead>
                <TableHead className="text-right">Capacidade (h/dia)</TableHead>
                <TableHead className="text-right">Eficiência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQuery.isLoading ? (
                <TableSkeletonRows rows={4} columns={7} />
              ) : workCenters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum centro de trabalho cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                workCenters.map((workCenter) => (
                  <TableRow key={String(workCenter.id)} className="hover:bg-accent/50">
                    <TableCell className="font-medium">{workCenter.code}</TableCell>
                    <TableCell>{workCenter.name}</TableCell>
                    <TableCell className="text-right">{workCenter.machines_count}</TableCell>
                    <TableCell className="text-right">{toNumber(workCenter.capacity_hours_per_day)}</TableCell>
                    <TableCell className="text-right">{formatRate(workCenter.efficiency_factor)}</TableCell>
                    <TableCell>
                      <Badge variant={workCenter.active ? 'secondary' : 'outline'}>
                        {workCenter.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Turnos" onClick={() => openShiftsDialog(workCenter)}>
                          <Clock className="size-4" />
                        </Button>
                        {canWrite && (
                          <Button variant="ghost" size="icon" title="Editar" onClick={() => openEditForm(workCenter)}>
                            <Pencil className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <WorkCenterFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        workCenter={editingWorkCenter}
        onSubmit={handleFormSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        submitError={formError}
      />

      <ShiftsDialog
        open={shiftsOpen}
        onOpenChange={setShiftsOpen}
        workCenter={shiftsWorkCenter}
        onSubmit={(shifts) => {
          if (shiftsWorkCenter) {
            shiftsMutation.mutate({ id: shiftsWorkCenter.id, shifts });
          }
        }}
        isPending={shiftsMutation.isPending}
        submitError={shiftsError}
      />
    </div>
  );
}
