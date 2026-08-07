import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarClock, Plus } from 'lucide-react';

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
import { RESERVATION_RESOURCE_TYPE_LABELS, ReservationStatusBadge, formatDateTime } from './facilitiesShared';

/** Aba "Reservas" de `/facilities` (P2, RF-FAC-054 a 056) — reserva de salas/equipamentos, rejeita sobreposição de intervalo (409). */
export function ReservationsTab() {
  const { permissions, hasRole } = useAuth();
  const canWrite = hasRole('admin') || permissions?.facilities === 'operate' || permissions?.facilities === 'approve';
  const [statusFilter, setStatusFilter] = React.useState<facilitiesApi.ReservationStatus | ''>('confirmed');
  const [createOpen, setCreateOpen] = React.useState(false);

  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['facility-reservations', statusFilter],
    queryFn: () => facilitiesApi.listReservations({ status: statusFilter || undefined, limit: 100 }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => facilitiesApi.cancelReservation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['facility-reservations'] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reservation-status-filter" className="text-sm text-muted-foreground">
            Status
          </Label>
          <SelectNative
            id="reservation-status-filter"
            className="max-w-48"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as facilitiesApi.ReservationStatus | '')}
          >
            <option value="">Todos</option>
            <option value="confirmed">Confirmada</option>
            <option value="canceled">Cancelada</option>
            <option value="completed">Concluída</option>
          </SelectNative>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nova reserva
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Recurso</TableHead>
            <TableHead>Assunto</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>Fim</TableHead>
            <TableHead>Status</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={canWrite ? 6 : 5} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={canWrite ? 6 : 5} className="text-center text-destructive">
                Não foi possível carregar as reservas. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((reservation) => (
            <TableRow key={reservation.id}>
              <TableCell>
                {RESERVATION_RESOURCE_TYPE_LABELS[reservation.resource_type]} — {reservation.facility_area?.name ?? (reservation.facility_area_id ? `área #${reservation.facility_area_id}` : `ativo #${reservation.asset_id}`)}
              </TableCell>
              <TableCell>{reservation.subject ?? '-'}</TableCell>
              <TableCell className="text-xs">{formatDateTime(reservation.starts_at)}</TableCell>
              <TableCell className="text-xs">{formatDateTime(reservation.ends_at)}</TableCell>
              <TableCell>
                <ReservationStatusBadge status={reservation.status} />
              </TableCell>
              {canWrite && (
                <TableCell>
                  {reservation.status === 'confirmed' && (
                    <Button size="sm" variant="outline" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate(reservation.id)}>
                      Cancelar
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={canWrite ? 6 : 5} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <CalendarClock className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhuma reserva encontrada.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <CreateReservationDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

const reservationSchema = z
  .object({
    resource_type: z.enum(['room', 'equipment']),
    facility_area_id: z.coerce.number().int().positive().optional().or(z.literal('').transform(() => undefined)),
    asset_id: z.coerce.number().int().positive().optional().or(z.literal('').transform(() => undefined)),
    starts_at: z.string().trim().min(1, 'Informe o início.'),
    ends_at: z.string().trim().min(1, 'Informe o fim.'),
    subject: z.string().trim().max(200).optional(),
  })
  .refine((data) => (data.resource_type === 'room' ? Boolean(data.facility_area_id) : Boolean(data.asset_id)), {
    message: 'Informe a área (sala) ou o ativo (equipamento) conforme o tipo de recurso.',
    path: ['facility_area_id'],
  });

type ReservationFormData = z.infer<typeof reservationSchema>;

function CreateReservationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReservationFormData>({ resolver: zodResolver(reservationSchema), defaultValues: { resource_type: 'room' } });

  const resourceType = watch('resource_type');

  const mutation = useMutation({
    mutationFn: (values: ReservationFormData) =>
      facilitiesApi.createReservation({
        resource_type: values.resource_type,
        facility_area_id: values.resource_type === 'room' ? values.facility_area_id ?? null : null,
        asset_id: values.resource_type === 'equipment' ? values.asset_id ?? null : null,
        starts_at: values.starts_at,
        ends_at: values.ends_at,
        subject: values.subject,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-reservations'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível criar a reserva — verifique se o horário já está ocupado')),
  });

  React.useEffect(() => {
    if (open) {
      reset({ resource_type: 'room' } as never);
      setFormError(null);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova reserva</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reservation-type">Tipo de recurso *</Label>
            <SelectNative id="reservation-type" {...register('resource_type')}>
              <option value="room">Sala (área física)</option>
              <option value="equipment">Equipamento (ativo)</option>
            </SelectNative>
          </div>
          {resourceType === 'room' ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reservation-area">ID da área física *</Label>
              <Input id="reservation-area" type="number" {...register('facility_area_id')} />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reservation-asset">ID do equipamento (asset) *</Label>
              <Input id="reservation-asset" type="number" {...register('asset_id')} />
            </div>
          )}
          {errors.facility_area_id && <p className="text-sm text-destructive">{errors.facility_area_id.message}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reservation-starts">Início *</Label>
              <Input id="reservation-starts" type="datetime-local" {...register('starts_at')} />
              {errors.starts_at && <p className="text-sm text-destructive">{errors.starts_at.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reservation-ends">Fim *</Label>
              <Input id="reservation-ends" type="datetime-local" {...register('ends_at')} />
              {errors.ends_at && <p className="text-sm text-destructive">{errors.ends_at.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reservation-subject">Assunto</Label>
            <Input id="reservation-subject" {...register('subject')} />
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Criar reserva'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
