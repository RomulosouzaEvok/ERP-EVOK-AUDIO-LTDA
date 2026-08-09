import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, SprayCan } from 'lucide-react';

import * as facilitiesApi from '@/api/facilities';
import { useAuth } from '@/context/AuthContext';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CLEANING_FREQUENCY_LABELS, formatDate, toDateInputValue } from './facilitiesShared';

/**
 * Aba "Limpeza" de `/facilities` — UC-62. Plano (nível `approve`, BREAKING
 * — era `operate`, RF-FAC-057) × execução (nível `operate`) + KPI de
 * aderência por plano/período.
 */
export function CleaningTab() {
  const { permissions, hasRole } = useAuth();
  const canOperate = hasRole('admin') || permissions?.facilities === 'operate' || permissions?.facilities === 'approve';
  const canApprove = hasRole('admin') || permissions?.facilities === 'approve';

  const [createPlanOpen, setCreatePlanOpen] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<facilitiesApi.CleaningSchedule | null>(null);
  const [execFormPlanId, setExecFormPlanId] = React.useState<number | null>(null);
  const [adherencePlanId, setAdherencePlanId] = React.useState<number | null>(null);

  const { data: plans, isLoading, isError } = useQuery({
    queryKey: ['facility-cleaning-schedules'],
    queryFn: () => facilitiesApi.listCleaningSchedules({ limit: 100 }),
  });

  const { data: executions } = useQuery({
    queryKey: ['facility-cleaning-executions'],
    queryFn: () => facilitiesApi.listCleaningExecutions({ limit: 20 }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Planos de limpeza</h2>
          {canApprove && (
            <Button type="button" size="sm" onClick={() => setCreatePlanOpen(true)}>
              <Plus className="size-4" />
              Novo plano
            </Button>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Área</TableHead>
              <TableHead>Frequência</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows columns={5} />}
            {isError && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-destructive">
                  Não foi possível carregar os planos de limpeza. Tente novamente.
                </TableCell>
              </TableRow>
            )}
            {plans?.data.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>{plan.area}</TableCell>
                <TableCell>{CLEANING_FREQUENCY_LABELS[plan.frequency]}</TableCell>
                <TableCell>{plan.responsible_person ?? '-'}</TableCell>
                <TableCell>{plan.active ? <Badge variant="success">Sim</Badge> : <Badge variant="secondary">Não</Badge>}</TableCell>
                <TableCell className="flex flex-wrap gap-2">
                  {canOperate && (
                    <Button size="sm" variant="outline" onClick={() => setExecFormPlanId(plan.id)}>
                      Registrar execução
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setAdherencePlanId(plan.id)}>
                    Aderência
                  </Button>
                  {canApprove && (
                    <Button size="sm" variant="outline" onClick={() => setEditingPlan(plan)}>
                      Editar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && !isError && plans?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <SprayCan className="size-8 text-muted-foreground/50" />
                    <p className="text-sm">Nenhum plano de limpeza cadastrado.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Últimas execuções</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plano</TableHead>
              <TableHead>Executado em</TableHead>
              <TableHead>OK</TableHead>
              <TableHead>Observações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(executions?.data ?? []).map((execution) => (
              <TableRow key={execution.id}>
                <TableCell>#{execution.plan_id}</TableCell>
                <TableCell>{formatDate(execution.executed_at)}</TableCell>
                <TableCell>{execution.ok ? <Badge variant="success">Sim</Badge> : <Badge variant="destructive">Não</Badge>}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{execution.notes ?? '-'}</TableCell>
              </TableRow>
            ))}
            {(executions?.data ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  Nenhuma execução registrada ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PlanDialog mode="create" open={createPlanOpen} plan={null} onClose={() => setCreatePlanOpen(false)} />
      <PlanDialog mode="edit" open={Boolean(editingPlan)} plan={editingPlan} onClose={() => setEditingPlan(null)} />
      <ExecutionDialog planId={execFormPlanId} onClose={() => setExecFormPlanId(null)} />
      <AdherenceDialog planId={adherencePlanId} onClose={() => setAdherencePlanId(null)} />
    </div>
  );
}

const planSchema = z.object({
  area: z.string().trim().min(1, 'Informe a área.').max(100),
  frequency: z.enum(['daily', 'alternate', 'weekly', 'biweekly', 'monthly']),
  responsible_person: z.string().trim().max(100).optional(),
  active: z.boolean().default(true),
});

type PlanFormData = z.infer<typeof planSchema>;

function PlanDialog({
  mode,
  open,
  plan,
  onClose,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  plan: facilitiesApi.CleaningSchedule | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof planSchema>, unknown, PlanFormData>({ resolver: zodResolver(planSchema), defaultValues: { frequency: 'weekly', active: true } });

  const mutation = useMutation({
    mutationFn: (values: PlanFormData) =>
      mode === 'create'
        ? facilitiesApi.createCleaningSchedule(values as facilitiesApi.CreateCleaningScheduleInput)
        : facilitiesApi.updateCleaningSchedule(plan!.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-cleaning-schedules'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível salvar o plano de limpeza')),
  });

  React.useEffect(() => {
    if (open) {
      if (mode === 'edit' && plan) {
        reset({ area: plan.area, frequency: plan.frequency, responsible_person: plan.responsible_person ?? '', active: plan.active });
      } else {
        reset({ frequency: 'weekly', active: true } as never);
      }
      setFormError(null);
    }
  }, [open, mode, plan, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo plano de limpeza' : `Editar plano — ${plan?.area ?? ''}`}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-area">Área *</Label>
              <Input id="plan-area" {...register('area')} />
              {errors.area && <p className="text-sm text-destructive">{errors.area.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-frequency">Frequência *</Label>
              <SelectNative id="plan-frequency" {...register('frequency')}>
                {Object.entries(CLEANING_FREQUENCY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plan-responsible">Responsável</Label>
            <Input id="plan-responsible" {...register('responsible_person')} />
          </div>
          <div className="flex items-center gap-2">
            <input id="plan-active" type="checkbox" {...register('active')} />
            <Label htmlFor="plan-active" className="text-sm">
              Plano ativo
            </Label>
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : mode === 'create' ? 'Criar plano' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExecutionDialog({ planId, onClose }: { planId: number | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const [ok, setOk] = React.useState(true);
  const [notes, setNotes] = React.useState('');

  const mutation = useMutation({
    mutationFn: () => facilitiesApi.createCleaningExecution({ plan_id: planId!, ok, notes: notes || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-cleaning-executions'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível registrar a execução')),
  });

  React.useEffect(() => {
    if (planId != null) {
      setOk(true);
      setNotes('');
      setFormError(null);
    }
  }, [planId]);

  return (
    <Dialog open={planId != null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar execução — plano #{planId}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <input id="exec-ok" type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
            <Label htmlFor="exec-ok" className="text-sm">
              Execução concluída conforme padrão
            </Label>
          </div>
          <Input placeholder="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {formError && <DidacticAlert error={formError} />}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Salvando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdherenceDialog({ planId, onClose }: { planId: number | null; onClose: () => void }) {
  const today = toDateInputValue();
  const [from, setFrom] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateInputValue(d);
  });
  const [to, setTo] = React.useState(today);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['facility-cleaning-adherence', planId, from, to],
    queryFn: () => facilitiesApi.getCleaningAdherence(planId!, from, to),
    enabled: planId != null && Boolean(from) && Boolean(to),
  });

  return (
    <Dialog open={planId != null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Aderência ao plano #{planId}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>De</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Até</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        {isLoading && <p className="text-sm text-muted-foreground">Calculando...</p>}
        {isError && <p className="text-sm text-destructive">Não foi possível calcular a aderência.</p>}
        {data && (
          <div className="flex flex-col gap-1 rounded-md border p-3 text-sm">
            <p>
              Execuções: <span className="font-semibold">{data.executed}</span> de <span className="font-semibold">{data.expected}</span> previstas
            </p>
            <p className="text-2xl font-semibold tabular-nums">{data.adherence_pct.toFixed(1)}%</p>
          </div>
        )}
        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
