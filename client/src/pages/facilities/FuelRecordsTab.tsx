import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Fuel, Plus } from 'lucide-react';

import * as facilitiesApi from '@/api/facilities';
import * as employeesApi from '@/api/employees';
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

function formatBRL(value: string | number): string {
  return `R$ ${Number(value ?? 0).toFixed(2)}`;
}

/** Aba "Abastecimento" de `/facilities` — CRUD de registros de abastecimento por veículo. */
export function FuelRecordsTab() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const [vehicleFilter, setVehicleFilter] = React.useState<string>('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingRecord, setEditingRecord] = React.useState<facilitiesApi.FuelRecord | null>(null);

  const { data: vehicles } = useQuery({
    queryKey: ['facility-vehicles-select'],
    queryFn: () => facilitiesApi.listVehicles({ limit: 200 }),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['facility-fuel-records', vehicleFilter],
    queryFn: () => facilitiesApi.listFuelRecords({ vehicle_id: vehicleFilter ? Number(vehicleFilter) : undefined, limit: 100 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fuel-vehicle-filter" className="text-sm text-muted-foreground">
            Veículo
          </Label>
          <SelectNative
            id="fuel-vehicle-filter"
            className="max-w-56"
            value={vehicleFilter}
            onChange={(event) => setVehicleFilter(event.target.value)}
          >
            <option value="">Todos</option>
            {(vehicles?.data ?? []).map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>{vehicle.plate}</option>
            ))}
          </SelectNative>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Novo abastecimento
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Veículo</TableHead>
            <TableHead>Litros</TableHead>
            <TableHead>Preço/L</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Motorista</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={canWrite ? 7 : 6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={canWrite ? 7 : 6} className="text-center text-destructive">
                Não foi possível carregar os abastecimentos. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((record) => (
            <TableRow key={record.id}>
              <TableCell>{new Date(record.record_date).toLocaleDateString('pt-BR')}</TableCell>
              <TableCell className="font-mono text-xs">{record.vehicle?.plate ?? `#${record.vehicle_id}`}</TableCell>
              <TableCell className="tabular-nums">{Number(record.liters).toFixed(2)} L</TableCell>
              <TableCell className="tabular-nums">{formatBRL(record.price_per_liter)}</TableCell>
              <TableCell className="tabular-nums font-medium">{formatBRL(record.total_cost)}</TableCell>
              <TableCell>{record.driver?.name ?? '-'}</TableCell>
              {canWrite && (
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => setEditingRecord(record)}>
                    Editar
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={canWrite ? 7 : 6} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Fuel className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum abastecimento registrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <FuelRecordDialog mode="create" open={createOpen} record={null} onClose={() => setCreateOpen(false)} />
      <FuelRecordDialog mode="edit" open={Boolean(editingRecord)} record={editingRecord} onClose={() => setEditingRecord(null)} />
    </div>
  );
}

const fuelRecordSchema = z.object({
  vehicle_id: z.coerce.number().int().positive('Selecione o veículo.'),
  record_date: z.string().trim().min(1, 'Informe a data.'),
  km_at_refuel: z.coerce.number().int().min(0).optional().or(z.literal('').transform(() => undefined)),
  liters: z.coerce.number().positive('Informe os litros.'),
  price_per_liter: z.coerce.number().positive('Informe o preço por litro.'),
  fuel_station: z.string().trim().max(100).optional(),
  driver_id: z.coerce.number().int().positive().optional().or(z.literal('').transform(() => undefined)),
});

type FuelRecordFormData = z.infer<typeof fuelRecordSchema>;

function FuelRecordDialog({
  mode,
  open,
  record,
  onClose,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  record: facilitiesApi.FuelRecord | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const { data: vehicles } = useQuery({
    queryKey: ['facility-vehicles-select'],
    queryFn: () => facilitiesApi.listVehicles({ limit: 200 }),
    enabled: open,
  });
  const { data: employees } = useQuery({
    queryKey: ['employees-active-select'],
    queryFn: () => employeesApi.listEmployees({ limit: 200, status: 'active' }),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FuelRecordFormData>({ resolver: zodResolver(fuelRecordSchema) });

  const mutation = useMutation({
    mutationFn: (values: FuelRecordFormData) =>
      mode === 'create'
        ? facilitiesApi.createFuelRecord(values as facilitiesApi.CreateFuelRecordInput)
        : facilitiesApi.updateFuelRecord(record!.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-fuel-records'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível salvar o abastecimento')),
  });

  React.useEffect(() => {
    if (open) {
      if (mode === 'edit' && record) {
        reset({
          vehicle_id: record.vehicle_id,
          record_date: record.record_date.slice(0, 16),
          km_at_refuel: record.km_at_refuel ?? undefined,
          liters: Number(record.liters),
          price_per_liter: Number(record.price_per_liter),
          fuel_station: record.fuel_station ?? '',
          driver_id: record.driver_id ?? undefined,
        });
      } else {
        reset({ record_date: new Date().toISOString().slice(0, 16) } as never);
      }
      setFormError(null);
    }
  }, [open, mode, record, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo abastecimento' : `Editar abastecimento #${record?.id ?? ''}`}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fuel-vehicle">Veículo *</Label>
              <SelectNative id="fuel-vehicle" {...register('vehicle_id')}>
                <option value="">Selecione...</option>
                {(vehicles?.data ?? []).map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>{vehicle.plate}</option>
                ))}
              </SelectNative>
              {errors.vehicle_id && <p className="text-sm text-destructive">{errors.vehicle_id.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fuel-date">Data/hora *</Label>
              <Input id="fuel-date" type="datetime-local" {...register('record_date')} />
              {errors.record_date && <p className="text-sm text-destructive">{errors.record_date.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fuel-km">Km no abastecimento</Label>
              <Input id="fuel-km" type="number" {...register('km_at_refuel')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fuel-liters">Litros *</Label>
              <Input id="fuel-liters" type="number" step="0.01" {...register('liters')} />
              {errors.liters && <p className="text-sm text-destructive">{errors.liters.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fuel-price">Preço/L *</Label>
              <Input id="fuel-price" type="number" step="0.01" {...register('price_per_liter')} />
              {errors.price_per_liter && <p className="text-sm text-destructive">{errors.price_per_liter.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fuel-station">Posto</Label>
              <Input id="fuel-station" {...register('fuel_station')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fuel-driver">Motorista</Label>
              <SelectNative id="fuel-driver" {...register('driver_id')}>
                <option value="">-</option>
                {(employees?.data ?? []).map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.name}</option>
                ))}
              </SelectNative>
            </div>
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : mode === 'create' ? 'Registrar abastecimento' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
