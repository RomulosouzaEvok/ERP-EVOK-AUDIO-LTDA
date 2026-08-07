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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const FREQUENCY_LABELS: Record<facilitiesApi.CleaningFrequency, string> = {
  daily: 'Diária',
  alternate: 'Dias alternados',
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
};

/** Aba "Limpeza" de `/facilities` — CRUD de programação de limpeza por área. */
export function CleaningSchedulesTab() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingSchedule, setEditingSchedule] = React.useState<facilitiesApi.CleaningSchedule | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['facility-cleaning-schedules'],
    queryFn: () => facilitiesApi.listCleaningSchedules({ limit: 100 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nova programação
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Área</TableHead>
            <TableHead>Frequência</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Última limpeza</TableHead>
            <TableHead>Próxima limpeza</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={canWrite ? 6 : 5} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={canWrite ? 6 : 5} className="text-center text-destructive">
                Não foi possível carregar as programações de limpeza. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((schedule) => (
            <TableRow key={schedule.id}>
              <TableCell>{schedule.area}</TableCell>
              <TableCell>{FREQUENCY_LABELS[schedule.frequency]}</TableCell>
              <TableCell>{schedule.responsible_person ?? '-'}</TableCell>
              <TableCell>{schedule.last_cleaning ? new Date(schedule.last_cleaning).toLocaleDateString('pt-BR') : '-'}</TableCell>
              <TableCell>{schedule.next_cleaning ? new Date(schedule.next_cleaning).toLocaleDateString('pt-BR') : '-'}</TableCell>
              {canWrite && (
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => setEditingSchedule(schedule)}>
                    Editar
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={canWrite ? 6 : 5} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <SprayCan className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhuma programação de limpeza cadastrada.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <CleaningScheduleDialog mode="create" open={createOpen} schedule={null} onClose={() => setCreateOpen(false)} />
      <CleaningScheduleDialog mode="edit" open={Boolean(editingSchedule)} schedule={editingSchedule} onClose={() => setEditingSchedule(null)} />
    </div>
  );
}

const cleaningScheduleSchema = z.object({
  area: z.string().trim().min(1, 'Informe a área.').max(100),
  frequency: z.enum(['daily', 'alternate', 'weekly', 'biweekly', 'monthly']),
  responsible_person: z.string().trim().max(100).optional(),
  last_cleaning: z.string().trim().optional(),
  next_cleaning: z.string().trim().optional(),
  notes: z.string().trim().max(2000).optional(),
});

type CleaningScheduleFormData = z.infer<typeof cleaningScheduleSchema>;

function CleaningScheduleDialog({
  mode,
  open,
  schedule,
  onClose,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  schedule: facilitiesApi.CleaningSchedule | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CleaningScheduleFormData>({
    resolver: zodResolver(cleaningScheduleSchema),
    defaultValues: { area: '', frequency: 'weekly' },
  });

  const mutation = useMutation({
    mutationFn: (values: CleaningScheduleFormData) =>
      mode === 'create'
        ? facilitiesApi.createCleaningSchedule(values as facilitiesApi.CreateCleaningScheduleInput)
        : facilitiesApi.updateCleaningSchedule(schedule!.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-cleaning-schedules'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível salvar a programação de limpeza')),
  });

  React.useEffect(() => {
    if (open) {
      if (mode === 'edit' && schedule) {
        reset({
          area: schedule.area,
          frequency: schedule.frequency,
          responsible_person: schedule.responsible_person ?? '',
          last_cleaning: schedule.last_cleaning ?? '',
          next_cleaning: schedule.next_cleaning ?? '',
          notes: schedule.notes ?? '',
        });
      } else {
        reset({ area: '', frequency: 'weekly' });
      }
      setFormError(null);
    }
  }, [open, mode, schedule, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nova programação de limpeza' : `Editar programação — ${schedule?.area ?? ''}`}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cleaning-area">Área *</Label>
              <Input id="cleaning-area" placeholder="Ex.: Refeitório" {...register('area')} />
              {errors.area && <p className="text-sm text-destructive">{errors.area.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cleaning-frequency">Frequência *</Label>
              <SelectNative id="cleaning-frequency" {...register('frequency')}>
                {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectNative>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cleaning-responsible">Responsável</Label>
            <Input id="cleaning-responsible" {...register('responsible_person')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cleaning-last">Última limpeza</Label>
              <Input id="cleaning-last" type="date" {...register('last_cleaning')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cleaning-next">Próxima limpeza</Label>
              <Input id="cleaning-next" type="date" {...register('next_cleaning')} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cleaning-notes">Observações</Label>
            <Input id="cleaning-notes" {...register('notes')} />
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : mode === 'create' ? 'Criar programação' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
