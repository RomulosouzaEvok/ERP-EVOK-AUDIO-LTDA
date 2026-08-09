import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Fuel, Plus } from 'lucide-react';

import * as facilitiesApi from '@/api/facilities';
import { useAuth } from '@/context/AuthContext';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency, formatDateTime } from './facilitiesShared';

/** Painel "Abastecimento" (dentro da aba Frota) — BREAKING: `vehicle_id` → `asset_id` (D-2). */
export function FuelRecordsPanel() {
  const { permissions, hasRole } = useAuth();
  const canWrite = hasRole('admin') || permissions?.facilities === 'operate' || permissions?.facilities === 'approve';
  const [assetFilter, setAssetFilter] = React.useState('');
  const [createOpen, setCreateOpen] = React.useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['facility-fuel-records', assetFilter],
    queryFn: () => facilitiesApi.listFuelRecords({ asset_id: assetFilter ? Number(assetFilter) : undefined, limit: 100 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fuel-asset-filter" className="text-sm text-muted-foreground">
            Filtrar por ID do veículo (asset)
          </Label>
          <Input id="fuel-asset-filter" className="max-w-48" type="number" value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)} />
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
            <TableHead>Km</TableHead>
            <TableHead>Litros</TableHead>
            <TableHead>Preço/L</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Tanque cheio</TableHead>
            <TableHead>Alerta</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={8} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-destructive">
                Não foi possível carregar os abastecimentos. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((record) => (
            <TableRow key={record.id}>
              <TableCell>{formatDateTime(record.record_date)}</TableCell>
              <TableCell className="font-mono text-xs">#{record.asset_id}</TableCell>
              <TableCell className="tabular-nums">{record.km_at_refuel?.toLocaleString('pt-BR') ?? '-'}</TableCell>
              <TableCell className="tabular-nums">{Number(record.liters).toFixed(2)} L</TableCell>
              <TableCell className="tabular-nums">{formatCurrency(record.price_per_liter)}</TableCell>
              <TableCell className="tabular-nums font-medium">{formatCurrency(record.total_cost)}</TableCell>
              <TableCell>{record.full_tank ? <Badge variant="success">Sim</Badge> : <Badge variant="outline">Não</Badge>}</TableCell>
              <TableCell>{record.consumption_alert ? <Badge variant="destructive">Anomalia</Badge> : '-'}</TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Fuel className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum abastecimento registrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <CreateFuelRecordDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

const fuelRecordSchema = z.object({
  asset_id: z.coerce.number().int().positive('Informe o ID do veículo (asset).'),
  record_date: z.string().trim().optional(),
  km_at_refuel: z.coerce.number().int().min(0).optional().or(z.literal('').transform(() => undefined)),
  liters: z.coerce.number().positive('Informe os litros.'),
  unit_price: z.coerce.number().positive('Informe o preço por litro.'),
  fuel_station: z.string().trim().max(100).optional(),
  full_tank: z.boolean().default(false),
  invoice_ref: z.string().trim().max(100).optional(),
});

type FuelRecordFormData = z.infer<typeof fuelRecordSchema>;

function CreateFuelRecordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof fuelRecordSchema>, unknown, FuelRecordFormData>({
    resolver: zodResolver(fuelRecordSchema),
    defaultValues: { full_tank: false },
  });

  const mutation = useMutation({
    mutationFn: (values: FuelRecordFormData) => facilitiesApi.createFuelRecord(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-fuel-records'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível registrar o abastecimento')),
  });

  React.useEffect(() => {
    if (open) {
      reset({ full_tank: false, record_date: new Date().toISOString().slice(0, 16) } as never);
      setFormError(null);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo abastecimento</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fuel-asset">ID do veículo (asset) *</Label>
              <Input id="fuel-asset" type="number" {...register('asset_id')} />
              {errors.asset_id && <p className="text-sm text-destructive">{errors.asset_id.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fuel-date">Data/hora</Label>
              <Input id="fuel-date" type="datetime-local" {...register('record_date')} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fuel-km">Km no abastecimento</Label>
              <Input id="fuel-km" type="number" {...register('km_at_refuel')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fuel-liters">Litros *</Label>
              <Input id="fuel-liters" type="number" step="0.001" {...register('liters')} />
              {errors.liters && <p className="text-sm text-destructive">{errors.liters.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fuel-price">Preço/L *</Label>
              <Input id="fuel-price" type="number" step="0.01" {...register('unit_price')} />
              {errors.unit_price && <p className="text-sm text-destructive">{errors.unit_price.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fuel-station">Posto</Label>
              <Input id="fuel-station" {...register('fuel_station')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fuel-invoice">Nota fiscal</Label>
              <Input id="fuel-invoice" {...register('invoice_ref')} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input id="fuel-full-tank" type="checkbox" {...register('full_tank')} />
            <Label htmlFor="fuel-full-tank" className="text-sm">
              Tanque cheio (necessário para o cálculo de consumo médio)
            </Label>
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Registrar abastecimento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
