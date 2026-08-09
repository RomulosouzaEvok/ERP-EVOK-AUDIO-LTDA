import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Plus } from 'lucide-react';

import * as facilitiesApi from '@/api/facilities';
import * as departmentsApi from '@/api/departments';
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

const AREA_TYPE_LABELS: Record<facilitiesApi.AreaType, string> = {
  production: 'Produção',
  warehouse: 'Almoxarifado',
  office: 'Escritório',
  lab: 'Laboratório',
  amenities: 'Área comum',
  external: 'Área externa',
};

/** Aba "Áreas" de `/facilities` — CRUD de áreas físicas da fábrica/escritório. */
export function AreasTab() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingArea, setEditingArea] = React.useState<facilitiesApi.FacilityArea | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['facility-areas'],
    queryFn: () => facilitiesApi.listAreas({ limit: 100 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nova área
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>m²</TableHead>
            <TableHead>Capacidade</TableHead>
            <TableHead>Departamento</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={canWrite ? 6 : 5} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={canWrite ? 6 : 5} className="text-center text-destructive">
                Não foi possível carregar as áreas físicas. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((area) => (
            <TableRow key={area.id}>
              <TableCell>{area.name}</TableCell>
              <TableCell>{AREA_TYPE_LABELS[area.area_type]}</TableCell>
              <TableCell className="tabular-nums">{area.square_meters ? `${Number(area.square_meters).toFixed(2)} m²` : '-'}</TableCell>
              <TableCell className="tabular-nums">{area.capacity_persons ?? '-'}</TableCell>
              <TableCell>{area.department?.name ?? '-'}</TableCell>
              {canWrite && (
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => setEditingArea(area)}>
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
                  <Building2 className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhuma área física cadastrada.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <AreaDialog mode="create" open={createOpen} area={null} onClose={() => setCreateOpen(false)} />
      <AreaDialog mode="edit" open={Boolean(editingArea)} area={editingArea} onClose={() => setEditingArea(null)} />
    </div>
  );
}

const areaSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.').max(100),
  area_type: z.enum(['production', 'warehouse', 'office', 'lab', 'amenities', 'external']),
  square_meters: z.coerce.number().min(0).optional().or(z.literal('').transform(() => undefined)),
  department_id: z.coerce.number().int().positive().optional().or(z.literal('').transform(() => undefined)),
  capacity_persons: z.coerce.number().int().min(0).optional().or(z.literal('').transform(() => undefined)),
  notes: z.string().trim().max(2000).optional(),
});

type AreaFormData = z.infer<typeof areaSchema>;

function AreaDialog({
  mode,
  open,
  area,
  onClose,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  area: facilitiesApi.FacilityArea | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const { data: departments } = useQuery({
    queryKey: ['departments-select'],
    queryFn: () => departmentsApi.listDepartments(),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof areaSchema>, unknown, AreaFormData>({
    resolver: zodResolver(areaSchema),
    defaultValues: { name: '', area_type: 'production' },
  });

  const mutation = useMutation({
    mutationFn: (values: AreaFormData) =>
      mode === 'create'
        ? facilitiesApi.createArea(values as facilitiesApi.CreateAreaInput)
        : facilitiesApi.updateArea(area!.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-areas'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível salvar a área física')),
  });

  React.useEffect(() => {
    if (open) {
      if (mode === 'edit' && area) {
        reset({
          name: area.name,
          area_type: area.area_type,
          square_meters: area.square_meters ? Number(area.square_meters) : undefined,
          department_id: area.department_id ?? undefined,
          capacity_persons: area.capacity_persons ?? undefined,
          notes: area.notes ?? '',
        });
      } else {
        reset({ name: '', area_type: 'production' });
      }
      setFormError(null);
    }
  }, [open, mode, area, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nova área física' : `Editar área — ${area?.name ?? ''}`}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="area-name">Nome *</Label>
              <Input id="area-name" placeholder="Ex.: Galpão 1" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="area-type">Tipo *</Label>
              <SelectNative id="area-type" {...register('area_type')}>
                {Object.entries(AREA_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectNative>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="area-square-meters">Área (m²)</Label>
              <Input id="area-square-meters" type="number" step="0.01" {...register('square_meters')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="area-capacity">Capacidade (pessoas)</Label>
              <Input id="area-capacity" type="number" {...register('capacity_persons')} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="area-department">Departamento</Label>
            <SelectNative id="area-department" {...register('department_id')}>
              <option value="">-</option>
              {(departments ?? []).map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="area-notes">Observações</Label>
            <Input id="area-notes" {...register('notes')} />
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : mode === 'create' ? 'Criar área' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
