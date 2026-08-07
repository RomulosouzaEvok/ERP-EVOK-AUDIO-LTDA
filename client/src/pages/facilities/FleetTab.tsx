import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Truck } from 'lucide-react';

import * as facilitiesApi from '@/api/facilities';
import { useAuth } from '@/context/AuthContext';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const STATUS_LABELS: Record<facilitiesApi.VehicleStatus, string> = {
  active: 'Ativo',
  maintenance: 'Em manutenção',
  deactivated: 'Desativado',
  sold: 'Vendido',
};

const FUEL_LABELS: Record<facilitiesApi.VehicleFuelType, string> = {
  gasoline: 'Gasolina',
  ethanol: 'Etanol',
  diesel: 'Diesel',
  flex: 'Flex',
  electric: 'Elétrico',
};

/** Aba "Frota" de `/facilities` — CRUD de veículos de frota administrativa/interna. */
export function FleetTab() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const [statusFilter, setStatusFilter] = React.useState<facilitiesApi.VehicleStatus | ''>('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingVehicle, setEditingVehicle] = React.useState<facilitiesApi.Vehicle | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['facility-vehicles', statusFilter],
    queryFn: () => facilitiesApi.listVehicles({ status: statusFilter || undefined, limit: 100 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vehicle-status-filter" className="text-sm text-muted-foreground">
            Status
          </Label>
          <SelectNative
            id="vehicle-status-filter"
            className="max-w-48"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as facilitiesApi.VehicleStatus | '')}
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SelectNative>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Novo veículo
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Placa</TableHead>
            <TableHead>Marca/Modelo</TableHead>
            <TableHead>Combustível</TableHead>
            <TableHead>Km atual</TableHead>
            <TableHead>Status</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={canWrite ? 6 : 5} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={canWrite ? 6 : 5} className="text-center text-destructive">
                Não foi possível carregar a frota. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((vehicle) => (
            <TableRow key={vehicle.id}>
              <TableCell className="font-mono text-xs">{vehicle.plate}</TableCell>
              <TableCell>{[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || '-'}</TableCell>
              <TableCell>{vehicle.fuel_type ? FUEL_LABELS[vehicle.fuel_type] : '-'}</TableCell>
              <TableCell className="tabular-nums">{vehicle.current_km.toLocaleString('pt-BR')} km</TableCell>
              <TableCell>
                <Badge variant={vehicle.status === 'active' ? 'success' : vehicle.status === 'maintenance' ? 'warning' : 'secondary'}>
                  {STATUS_LABELS[vehicle.status]}
                </Badge>
              </TableCell>
              {canWrite && (
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => setEditingVehicle(vehicle)}>
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
                  <Truck className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum veículo cadastrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <VehicleDialog mode="create" open={createOpen} vehicle={null} onClose={() => setCreateOpen(false)} />
      <VehicleDialog mode="edit" open={Boolean(editingVehicle)} vehicle={editingVehicle} onClose={() => setEditingVehicle(null)} />
    </div>
  );
}

const vehicleSchema = z.object({
  plate: z.string().trim().min(1, 'Informe a placa.').max(10),
  brand: z.string().trim().max(50).optional(),
  model: z.string().trim().max(50).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional().or(z.literal('').transform(() => undefined)),
  fuel_type: z.string().optional(),
  renavam: z.string().trim().max(30).optional(),
  current_km: z.coerce.number().int().min(0).default(0),
  status: z.enum(['active', 'maintenance', 'deactivated', 'sold']).default('active'),
  insurance_company: z.string().trim().max(100).optional(),
  insurance_expiry: z.string().trim().optional(),
  notes: z.string().trim().max(2000).optional(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

function VehicleDialog({
  mode,
  open,
  vehicle,
  onClose,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  vehicle: facilitiesApi.Vehicle | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { plate: '', current_km: 0, status: 'active' },
  });

  const mutation = useMutation({
    mutationFn: (values: VehicleFormData) => {
      const payload = {
        ...values,
        fuel_type: values.fuel_type ? (values.fuel_type as facilitiesApi.VehicleFuelType) : undefined,
      };
      return mode === 'create'
        ? facilitiesApi.createVehicle(payload as facilitiesApi.CreateVehicleInput)
        : facilitiesApi.updateVehicle(vehicle!.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-vehicles'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível salvar o veículo')),
  });

  React.useEffect(() => {
    if (open) {
      if (mode === 'edit' && vehicle) {
        reset({
          plate: vehicle.plate,
          brand: vehicle.brand ?? '',
          model: vehicle.model ?? '',
          year: vehicle.year ?? undefined,
          fuel_type: vehicle.fuel_type ?? '',
          renavam: vehicle.renavam ?? '',
          current_km: vehicle.current_km,
          status: vehicle.status,
          insurance_company: vehicle.insurance_company ?? '',
          insurance_expiry: vehicle.insurance_expiry ?? '',
          notes: vehicle.notes ?? '',
        });
      } else {
        reset({ plate: '', current_km: 0, status: 'active' });
      }
      setFormError(null);
    }
  }, [open, mode, vehicle, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo veículo' : `Editar veículo ${vehicle?.plate ?? ''}`}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-plate">Placa *</Label>
              <Input id="vehicle-plate" placeholder="ABC1D23" {...register('plate')} />
              {errors.plate && <p className="text-sm text-destructive">{errors.plate.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-status">Status</Label>
              <SelectNative id="vehicle-status" {...register('status')}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectNative>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-brand">Marca</Label>
              <Input id="vehicle-brand" {...register('brand')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-model">Modelo</Label>
              <Input id="vehicle-model" {...register('model')} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-year">Ano</Label>
              <Input id="vehicle-year" type="number" {...register('year')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-fuel">Combustível</Label>
              <SelectNative id="vehicle-fuel" {...register('fuel_type')}>
                <option value="">-</option>
                {Object.entries(FUEL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-km">Km atual</Label>
              <Input id="vehicle-km" type="number" {...register('current_km')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-renavam">Renavam</Label>
              <Input id="vehicle-renavam" {...register('renavam')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-insurance-company">Seguradora</Label>
              <Input id="vehicle-insurance-company" {...register('insurance_company')} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vehicle-insurance-expiry">Vencimento do seguro</Label>
            <Input id="vehicle-insurance-expiry" type="date" {...register('insurance_expiry')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vehicle-notes">Observações</Label>
            <Input id="vehicle-notes" {...register('notes')} />
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : mode === 'create' ? 'Criar veículo' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
