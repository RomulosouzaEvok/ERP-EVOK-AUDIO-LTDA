import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Route } from 'lucide-react';

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
import { TRIP_PURPOSE_LABELS, TripStatusBadge, formatDateTime } from './facilitiesShared';

/** Painel "Diário de Uso" (dentro da aba Frota) — UC-58: agendar, sair, retornar, cancelar; integridade de odômetro. */
export function TripsPanel() {
  const { permissions, hasRole } = useAuth();
  const canWrite = hasRole('admin') || permissions?.facilities === 'operate' || permissions?.facilities === 'approve';
  const [statusFilter, setStatusFilter] = React.useState<facilitiesApi.TripStatus | ''>('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['facility-trips', statusFilter],
    queryFn: () => facilitiesApi.listTrips({ status: statusFilter || undefined, limit: 100 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="trip-status-filter" className="text-sm text-muted-foreground">
            Status
          </Label>
          <SelectNative
            id="trip-status-filter"
            className="max-w-48"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as facilitiesApi.TripStatus | '')}
          >
            <option value="">Todos</option>
            <option value="scheduled">Agendado</option>
            <option value="out">Em uso</option>
            <option value="returned">Retornado</option>
            <option value="canceled">Cancelado</option>
          </SelectNative>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Agendar uso
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Veículo</TableHead>
            <TableHead>Condutor</TableHead>
            <TableHead>Finalidade</TableHead>
            <TableHead>Saída</TableHead>
            <TableHead>Retorno</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={7} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-destructive">
                Não foi possível carregar o diário de uso. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((trip) => (
            <TableRow key={trip.id}>
              <TableCell className="font-mono text-xs">#{trip.asset_id}</TableCell>
              <TableCell className="font-mono text-xs">#{trip.driver_id}</TableCell>
              <TableCell>{TRIP_PURPOSE_LABELS[trip.purpose] ?? trip.purpose}</TableCell>
              <TableCell className="text-xs">
                {formatDateTime(trip.departure_at)} {trip.departure_km != null && `(${trip.departure_km} km)`}
              </TableCell>
              <TableCell className="text-xs">
                {formatDateTime(trip.return_at)} {trip.return_km != null && `(${trip.return_km} km)`}
              </TableCell>
              <TableCell>
                <TripStatusBadge status={trip.status} />
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => setDetailId(trip.id)}>
                  Detalhe
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Route className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum uso registrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <CreateTripDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => setDetailId(id)} />
      <TripDetailDialog tripId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

const createTripSchema = z.object({
  asset_id: z.coerce.number().int().positive('Informe o ID do veículo (asset).'),
  driver_id: z.coerce.number().int().positive('Informe o ID do condutor.'),
  purpose: z.enum(['delivery', 'executive', 'errand', 'other']),
  destination: z.string().trim().max(200).optional(),
  scheduled_departure_at: z.string().trim().optional(),
});

type CreateTripFormData = z.infer<typeof createTripSchema>;

function CreateTripDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTripFormData>({ resolver: zodResolver(createTripSchema), defaultValues: { purpose: 'delivery' } });

  const mutation = useMutation({
    mutationFn: (values: CreateTripFormData) => facilitiesApi.createTrip(values),
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: ['facility-trips'] });
      setFormError(null);
      onCreated(trip.id);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível agendar o uso do veículo')),
  });

  React.useEffect(() => {
    if (open) {
      reset({ purpose: 'delivery' } as never);
      setFormError(null);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Agendar uso de veículo</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trip-asset">ID do veículo (asset) *</Label>
              <Input id="trip-asset" type="number" {...register('asset_id')} />
              {errors.asset_id && <p className="text-sm text-destructive">{errors.asset_id.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trip-driver">ID do condutor *</Label>
              <Input id="trip-driver" type="number" {...register('driver_id')} />
              {errors.driver_id && <p className="text-sm text-destructive">{errors.driver_id.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="trip-purpose">Finalidade</Label>
            <SelectNative id="trip-purpose" {...register('purpose')}>
              {Object.entries(TRIP_PURPOSE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="trip-destination">Destino</Label>
            <Input id="trip-destination" {...register('destination')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="trip-scheduled">Data/hora prevista de saída</Label>
            <Input id="trip-scheduled" type="datetime-local" {...register('scheduled_departure_at')} />
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Agendar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TripDetailDialog({ tripId, onClose }: { tripId: number | null; onClose: () => void }) {
  const { permissions, hasRole } = useAuth();
  const canApprove = hasRole('admin') || permissions?.facilities === 'approve';
  const queryClient = useQueryClient();
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);
  const [departureKm, setDepartureKm] = React.useState('');
  const [divergenceJustification, setDivergenceJustification] = React.useState('');
  const [returnKm, setReturnKm] = React.useState('');
  const [incidents, setIncidents] = React.useState('');
  const [cancelReason, setCancelReason] = React.useState('');

  const { data: trip, isLoading } = useQuery({
    queryKey: ['facility-trip-detail', tripId],
    queryFn: () => facilitiesApi.getTrip(tripId!),
    enabled: tripId != null,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['facility-trip-detail', tripId] });
    queryClient.invalidateQueries({ queryKey: ['facility-trips'] });
  };

  const departMutation = useMutation({
    mutationFn: () =>
      facilitiesApi.departTrip(tripId!, {
        departure_km: departureKm ? Number(departureKm) : undefined,
        divergence_justification: divergenceJustification || undefined,
      }),
    onSuccess: () => {
      setActionError(null);
      invalidate();
    },
    onError: (error) =>
      setActionError(
        translateApiError(
          error,
          'Não foi possível registrar a saída — verifique CRLV/seguro vencido, autorização do condutor ou divergência de odômetro',
        ),
      ),
  });

  const returnMutation = useMutation({
    mutationFn: () => facilitiesApi.returnTrip(tripId!, { return_km: Number(returnKm), incidents: incidents || undefined }),
    onSuccess: () => {
      setActionError(null);
      invalidate();
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível registrar o retorno')),
  });

  const cancelMutation = useMutation({
    mutationFn: () => facilitiesApi.cancelTrip(tripId!, cancelReason),
    onSuccess: () => {
      setActionError(null);
      invalidate();
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível cancelar o uso')),
  });

  React.useEffect(() => {
    if (tripId != null) {
      setActionError(null);
      setDepartureKm('');
      setDivergenceJustification('');
      setReturnKm('');
      setIncidents('');
      setCancelReason('');
    }
  }, [tripId]);

  return (
    <Dialog open={tripId != null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Uso de veículo #{tripId}</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {trip && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <TripStatusBadge status={trip.status} />
              <span className="text-xs text-muted-foreground">Veículo #{trip.asset_id} · Condutor #{trip.driver_id}</span>
            </div>
            <p className="text-sm">Destino: {trip.destination ?? '-'}</p>

            {actionError && <DidacticAlert error={actionError} />}

            {trip.status === 'scheduled' && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-semibold">Registrar saída</p>
                <Input placeholder="Km de saída" type="number" value={departureKm} onChange={(e) => setDepartureKm(e.target.value)} />
                <Input
                  placeholder="Justificativa de divergência de odômetro (só se km informado for menor que o último retorno — exige aprovação)"
                  value={divergenceJustification}
                  onChange={(e) => setDivergenceJustification(e.target.value)}
                />
                {divergenceJustification && !canApprove && (
                  <p className="text-xs text-destructive">
                    Divergência de odômetro exige nível de aprovação (approve) no módulo Facilities.
                  </p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" disabled={departMutation.isPending} onClick={() => departMutation.mutate()}>
                    Confirmar saída
                  </Button>
                  <Button size="sm" variant="outline" disabled={cancelMutation.isPending} onClick={() => setCancelReason('Cancelado antes da saída')}>
                    Cancelar uso
                  </Button>
                </div>
              </div>
            )}

            {trip.status === 'out' && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-semibold">Registrar retorno</p>
                <Input placeholder="Km de retorno *" type="number" value={returnKm} onChange={(e) => setReturnKm(e.target.value)} />
                <Input placeholder="Ocorrências (opcional)" value={incidents} onChange={(e) => setIncidents(e.target.value)} />
                <Button size="sm" className="self-start" disabled={!returnKm || returnMutation.isPending} onClick={() => returnMutation.mutate()}>
                  Confirmar retorno
                </Button>
              </div>
            )}

            {(trip.status === 'scheduled' || trip.status === 'out') && (
              <div className="flex flex-col gap-2 rounded-md border border-destructive/30 p-3">
                <p className="text-sm font-semibold">Cancelar uso</p>
                <Input placeholder="Motivo do cancelamento" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                <Button
                  size="sm"
                  variant="destructive"
                  className="self-start"
                  disabled={!cancelReason.trim() || cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate()}
                >
                  Confirmar cancelamento
                </Button>
              </div>
            )}

            {trip.status === 'returned' && <p className="text-sm text-success">Uso concluído — odômetro atualizado.</p>}
            {trip.status === 'canceled' && <p className="text-sm text-muted-foreground">Motivo: {trip.cancel_reason ?? '-'}</p>}
          </div>
        )}

        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
