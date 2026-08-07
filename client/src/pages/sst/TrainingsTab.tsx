import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, GraduationCap, Plus } from 'lucide-react';

import * as sstApi from '@/api/sst';
import * as employeesApi from '@/api/employees';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate, toDateInputValue } from './sstShared';

const NORMA_OPTIONS: sstApi.TrainingNorma[] = [
  'NR-6',
  'NR-10',
  'NR-11',
  'NR-12',
  'NR-17',
  'NR-20',
  'NR-23_brigada',
  'primeiros_socorros',
  'CIPA',
  'DDS_tema',
  'outro',
];

/** Aba Treinamentos de Segurança (NRs): lista de treinamentos realizados + lista de bloqueio operacional (RF-SST-046). */
export function TrainingsTab() {
  const [newTrainingOpen, setNewTrainingOpen] = React.useState(false);
  const [normaFilter, setNormaFilter] = React.useState<sstApi.TrainingNorma | ''>('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sst-trainings', normaFilter],
    queryFn: () => sstApi.listTrainings({ norma: normaFilter || undefined, limit: 50 }),
  });

  const { data: blocklist } = useQuery({
    queryKey: ['sst-trainings-blocklist'],
    queryFn: sstApi.getTrainingBlocklist,
  });

  return (
    <div className="flex flex-col gap-4">
      {Boolean(blocklist?.length) && (
        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">{blocklist?.length} funcionário(s) bloqueado(s) por treinamento vencido</p>
            <p className="text-xs">
              Consultado pelo módulo de Apontamento de Produção antes de iniciar etapa (RF-SST-046):{' '}
              {blocklist?.slice(0, 5).map((entry) => `#${entry.employee_id} (${entry.norma})`).join(', ')}
              {(blocklist?.length ?? 0) > 5 ? '…' : ''}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="training-norma-filter" className="text-sm text-muted-foreground">
            Norma
          </Label>
          <SelectNative
            id="training-norma-filter"
            className="max-w-56"
            value={normaFilter}
            onChange={(event) => setNormaFilter(event.target.value as sstApi.TrainingNorma | '')}
          >
            <option value="">Todas</option>
            {NORMA_OPTIONS.map((norma) => (
              <option key={norma} value={norma}>
                {norma}
              </option>
            ))}
          </SelectNative>
        </div>
        <Button type="button" onClick={() => setNewTrainingOpen(true)}>
          <Plus className="size-4" />
          Registrar treinamento
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Funcionário</TableHead>
            <TableHead>Norma</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Carga horária</TableHead>
            <TableHead>Instrutor/entidade</TableHead>
            <TableHead>Validade</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-destructive">
                Não foi possível carregar os treinamentos.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((training) => (
            <TableRow
              key={training.id}
              className="border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5"
            >
              <TableCell>{training.employee?.name ?? `#${training.employee_id}`}</TableCell>
              <TableCell className="font-mono text-xs">{training.norma}</TableCell>
              <TableCell>{formatDate(training.data)}</TableCell>
              <TableCell className="text-right tabular-nums">{training.carga_horaria}h</TableCell>
              <TableCell>{training.instrutor_entidade}</TableCell>
              <TableCell>{formatDate(training.validade)}</TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <GraduationCap className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum treinamento registrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <NewTrainingDialog open={newTrainingOpen} onClose={() => setNewTrainingOpen(false)} />
    </div>
  );
}

const newTrainingSchema = z.object({
  employee_id: z.coerce.number().int().positive('Selecione o funcionário.'),
  norma: z.enum([
    'NR-6',
    'NR-10',
    'NR-11',
    'NR-12',
    'NR-17',
    'NR-20',
    'NR-23_brigada',
    'primeiros_socorros',
    'CIPA',
    'DDS_tema',
    'outro',
  ]),
  data: z.string().min(1, 'Informe a data do treinamento.'),
  carga_horaria: z.coerce.number().positive('Informe a carga horária.'),
  instrutor_entidade: z.string().min(1, 'Informe o instrutor/entidade.'),
  certificado_url: z.string().optional(),
  identificacao_operador: z.string().optional(),
});

type NewTrainingFormData = z.infer<typeof newTrainingSchema>;

function NewTrainingDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const { data: employees } = useQuery({
    queryKey: ['employees-active-select'],
    queryFn: () => employeesApi.listEmployees({ limit: 200, status: 'active' }),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewTrainingFormData>({
    resolver: zodResolver(newTrainingSchema),
    defaultValues: { norma: 'NR-11', data: toDateInputValue() },
  });

  const norma = watch('norma');

  const mutation = useMutation({
    mutationFn: (values: NewTrainingFormData) =>
      sstApi.createTraining({
        ...values,
        certificado_url: values.certificado_url?.trim() || undefined,
        identificacao_operador: values.identificacao_operador?.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sst-trainings'] });
      queryClient.invalidateQueries({ queryKey: ['sst-trainings-blocklist'] });
      reset({ norma: 'NR-11', data: toDateInputValue() } as never);
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível registrar o treinamento')),
  });

  React.useEffect(() => {
    if (open) {
      reset({ norma: 'NR-11', data: toDateInputValue() } as never);
      setFormError(null);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar treinamento de segurança</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="training-employee">Funcionário</Label>
            <SelectNative id="training-employee" {...register('employee_id')}>
              <option value="">Selecione...</option>
              {(employees?.data ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </SelectNative>
            {errors.employee_id && <p className="text-sm text-destructive">{errors.employee_id.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="training-norma">Norma</Label>
              <SelectNative id="training-norma" {...register('norma')}>
                {NORMA_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="training-data">Data</Label>
              <Input id="training-data" type="date" {...register('data')} />
              {errors.data && <p className="text-sm text-destructive">{errors.data.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="training-carga">Carga horária (h)</Label>
              <Input id="training-carga" type="number" step="any" {...register('carga_horaria')} />
              {errors.carga_horaria && <p className="text-sm text-destructive">{errors.carga_horaria.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="training-instrutor">Instrutor/entidade</Label>
              <Input id="training-instrutor" {...register('instrutor_entidade')} />
              {errors.instrutor_entidade && <p className="text-sm text-destructive">{errors.instrutor_entidade.message}</p>}
            </div>
          </div>
          {norma === 'NR-11' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="training-identificacao">Identificação do operador (crachá) — obrigatório para NR-11</Label>
              <Input id="training-identificacao" {...register('identificacao_operador')} />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="training-certificado">URL do certificado</Label>
            <Input id="training-certificado" placeholder="https://..." {...register('certificado_url')} />
          </div>
          {formError && <DidacticAlert error={formError} />}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Registrar treinamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
