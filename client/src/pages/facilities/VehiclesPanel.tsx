import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText, Plus, Truck } from 'lucide-react';

import * as facilitiesApi from '@/api/facilities';
import * as departmentsApi from '@/api/departments';
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
import {
  ASSET_STATUS_LABELS,
  AssetStatusBadge,
  DeadlineBadge,
  VEHICLE_DOC_TYPE_LABELS,
  VehicleDocStatusBadge,
} from './facilitiesShared';

const FUEL_LABELS: Record<facilitiesApi.VehicleFuelType, string> = {
  gasoline: 'Gasolina',
  ethanol: 'Etanol',
  diesel: 'Diesel',
  flex: 'Flex',
  electric: 'Elétrico',
};

/** Painel "Veículos" (dentro da aba Frota) — lista/cadastro de veículos (extensão de Asset, D-2) + documentos com vencimento. */
export function VehiclesPanel() {
  const { permissions, hasRole } = useAuth();
  const canWrite = hasRole('admin') || permissions?.facilities === 'operate' || permissions?.facilities === 'approve';
  const [statusFilter, setStatusFilter] = React.useState<facilitiesApi.AssetStatus | ''>('');
  const [documentExpiring, setDocumentExpiring] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [detailAssetId, setDetailAssetId] = React.useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['facility-vehicles', statusFilter, documentExpiring],
    queryFn: () => facilitiesApi.listVehicles({ status: statusFilter || undefined, document_expiring: documentExpiring || undefined, limit: 100 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vehicle-status-filter" className="text-sm text-muted-foreground">
              Status
            </Label>
            <SelectNative
              id="vehicle-status-filter"
              className="max-w-48"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as facilitiesApi.AssetStatus | '')}
            >
              <option value="">Todos</option>
              {Object.entries(ASSET_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectNative>
          </div>
          <Button
            type="button"
            size="sm"
            variant={documentExpiring ? 'default' : 'outline'}
            onClick={() => setDocumentExpiring((v) => !v)}
          >
            Documento vencendo (≤30d)
          </Button>
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
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-destructive">
                Não foi possível carregar a frota. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((vehicle) => (
            <TableRow key={vehicle.asset_id}>
              <TableCell className="font-mono text-xs">{vehicle.plate}</TableCell>
              <TableCell>{[vehicle.asset?.brand, vehicle.asset?.model].filter(Boolean).join(' ') || '-'}</TableCell>
              <TableCell>{vehicle.fuel_type ? FUEL_LABELS[vehicle.fuel_type] : '-'}</TableCell>
              <TableCell className="tabular-nums">{vehicle.current_km.toLocaleString('pt-BR')} km</TableCell>
              <TableCell>{vehicle.asset ? <AssetStatusBadge status={vehicle.asset.status} /> : '-'}</TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => setDetailAssetId(vehicle.asset_id)}>
                  <FileText className="size-3.5" />
                  Detalhe
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Truck className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum veículo cadastrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <CreateVehicleDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(assetId) => setDetailAssetId(assetId)} />
      <VehicleDetailDialog assetId={detailAssetId} onClose={() => setDetailAssetId(null)} canWrite={canWrite} />
    </div>
  );
}

const createVehicleSchema = z.object({
  brand: z.string().trim().min(1, 'Informe a marca.').max(50),
  model: z.string().trim().min(1, 'Informe o modelo.').max(50),
  plate: z.string().trim().min(1, 'Informe a placa.').max(10),
  fuel_type: z.enum(['gasoline', 'ethanol', 'diesel', 'flex', 'electric']),
  renavam: z.string().trim().max(30).optional(),
  chassi: z.string().trim().max(50).optional(),
  color: z.string().trim().max(30).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional().or(z.literal('').transform(() => undefined)),
  current_km: z.coerce.number().int().min(0).default(0),
  tank_capacity_liters: z.coerce.number().positive().optional().or(z.literal('').transform(() => undefined)),
  required_cnh_category: z.string().trim().max(5).optional(),
  department_id: z.coerce.number().int().positive().optional().or(z.literal('').transform(() => undefined)),
  responsible_id: z.coerce.number().int().positive().optional().or(z.literal('').transform(() => undefined)),
  notes: z.string().trim().max(2000).optional(),
});

type CreateVehicleFormData = z.infer<typeof createVehicleSchema>;

function CreateVehicleDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (assetId: number) => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const { data: departments } = useQuery({ queryKey: ['departments-select'], queryFn: () => departmentsApi.listDepartments(), enabled: open });
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
  } = useForm<CreateVehicleFormData>({ resolver: zodResolver(createVehicleSchema), defaultValues: { current_km: 0 } });

  const mutation = useMutation({
    mutationFn: (values: CreateVehicleFormData) => facilitiesApi.createVehicle(values as facilitiesApi.CreateVehicleInput),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['facility-vehicles'] });
      setFormError(null);
      onCreated(result.asset_id);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível cadastrar o veículo')),
  });

  React.useEffect(() => {
    if (open) {
      reset({ current_km: 0 } as never);
      setFormError(null);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo veículo</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-plate">Placa *</Label>
              <Input id="vehicle-plate" placeholder="ABC1D23" {...register('plate')} />
              {errors.plate && <p className="text-sm text-destructive">{errors.plate.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-fuel">Combustível *</Label>
              <SelectNative id="vehicle-fuel" {...register('fuel_type')}>
                <option value="">Selecione...</option>
                {Object.entries(FUEL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectNative>
              {errors.fuel_type && <p className="text-sm text-destructive">{errors.fuel_type.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-brand">Marca *</Label>
              <Input id="vehicle-brand" {...register('brand')} />
              {errors.brand && <p className="text-sm text-destructive">{errors.brand.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-model">Modelo *</Label>
              <Input id="vehicle-model" {...register('model')} />
              {errors.model && <p className="text-sm text-destructive">{errors.model.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-year">Ano</Label>
              <Input id="vehicle-year" type="number" {...register('year')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-km">Km atual</Label>
              <Input id="vehicle-km" type="number" {...register('current_km')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-tank">Tanque (L)</Label>
              <Input id="vehicle-tank" type="number" step="0.01" {...register('tank_capacity_liters')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-renavam">Renavam</Label>
              <Input id="vehicle-renavam" {...register('renavam')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-cnh-cat">Categoria de CNH exigida</Label>
              <Input id="vehicle-cnh-cat" placeholder="Ex.: B" {...register('required_cnh_category')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-department">Departamento</Label>
              <SelectNative id="vehicle-department" {...register('department_id')}>
                <option value="">-</option>
                {(departments ?? []).map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-responsible">Responsável</Label>
              <SelectNative id="vehicle-responsible" {...register('responsible_id')}>
                <option value="">-</option>
                {(employees?.data ?? []).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
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
              {mutation.isPending ? 'Salvando...' : 'Criar veículo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VehicleDetailDialog({ assetId, onClose, canWrite }: { assetId: number | null; onClose: () => void; canWrite: boolean }) {
  const { permissions, hasRole } = useAuth();
  const canApprove = hasRole('admin') || permissions?.facilities === 'approve';
  const queryClient = useQueryClient();
  const [docFormOpen, setDocFormOpen] = React.useState(false);
  const [releaseDocId, setReleaseDocId] = React.useState<number | null>(null);
  const [releaseReason, setReleaseReason] = React.useState('');
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ['facility-vehicle-detail', assetId],
    queryFn: () => facilitiesApi.getVehicle(assetId!),
    enabled: assetId != null,
  });

  const { data: documents } = useQuery({
    queryKey: ['facility-vehicle-documents', assetId],
    queryFn: () => facilitiesApi.listVehicleDocuments(assetId!),
    enabled: assetId != null,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['facility-vehicle-detail', assetId] });
    queryClient.invalidateQueries({ queryKey: ['facility-vehicle-documents', assetId] });
    queryClient.invalidateQueries({ queryKey: ['facility-vehicles'] });
  };

  const releaseMutation = useMutation({
    mutationFn: () => facilitiesApi.releaseVehicleDocument(assetId!, releaseDocId!, { release_reason: releaseReason }),
    onSuccess: () => {
      setActionError(null);
      setReleaseDocId(null);
      setReleaseReason('');
      invalidate();
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível liberar a saída com o documento vencido')),
  });

  React.useEffect(() => {
    if (assetId != null) {
      setActionError(null);
      setDocFormOpen(false);
      setReleaseDocId(null);
      setReleaseReason('');
    }
  }, [assetId]);

  return (
    <Dialog open={assetId != null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{vehicle ? `Veículo ${vehicle.plate}` : 'Veículo'}</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {vehicle && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <span>Marca/Modelo: {[vehicle.asset?.brand, vehicle.asset?.model].filter(Boolean).join(' ') || '-'}</span>
              <span>Status: {vehicle.asset ? <AssetStatusBadge status={vehicle.asset.status} /> : '-'}</span>
              <span>Km atual: {vehicle.current_km.toLocaleString('pt-BR')} km</span>
              <span>RENAVAM: {vehicle.renavam ?? '-'}</span>
              <span>Chassi: {vehicle.chassi ?? '-'}</span>
              <span>Tanque: {vehicle.tank_capacity_liters ? `${vehicle.tank_capacity_liters} L` : '-'}</span>
              <span>Categoria CNH exigida: {vehicle.required_cnh_category ?? '-'}</span>
              <span>Departamento: {vehicle.asset?.department?.name ?? '-'}</span>
              <span>Responsável: {vehicle.asset?.responsible?.name ?? '-'}</span>
            </div>

            {actionError && <DidacticAlert error={actionError} />}

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Documentos com vencimento</p>
                {canWrite && (
                  <Button size="sm" variant="outline" onClick={() => setDocFormOpen((v) => !v)}>
                    <Plus className="size-3.5" />
                    Novo documento
                  </Button>
                )}
              </div>

              {docFormOpen && <NewVehicleDocumentForm assetId={assetId!} onDone={() => { setDocFormOpen(false); invalidate(); }} />}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    {canApprove && <TableHead>Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(documents ?? []).map((doc) => {
                    const isExpiredInsurance = doc.doc_type === 'seguro' && doc.status === 'vencido' && !doc.released_by;
                    return (
                      <TableRow key={doc.id}>
                        <TableCell>{VEHICLE_DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}</TableCell>
                        <TableCell className="text-xs">{doc.reference ?? '-'}</TableCell>
                        <TableCell>
                          {doc.valid_until ? <DeadlineBadge dueDate={doc.valid_until} /> : '-'}
                        </TableCell>
                        <TableCell>
                          <VehicleDocStatusBadge status={doc.status} />
                        </TableCell>
                        {canApprove && (
                          <TableCell>
                            {isExpiredInsurance && (
                              <Button size="sm" variant="outline" onClick={() => setReleaseDocId(doc.id)}>
                                Liberar saída
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {(documents ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canApprove ? 5 : 4} className="text-center text-sm text-muted-foreground">
                        Nenhum documento cadastrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {releaseDocId != null && (
              <div className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm font-medium">
                  Liberar saída com seguro vencido (nível aprovação) — a justificativa fica registrada na trilha de auditoria.
                </p>
                <Input
                  placeholder="Motivo da liberação (obrigatório)"
                  value={releaseReason}
                  onChange={(e) => setReleaseReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={!releaseReason.trim() || releaseMutation.isPending}
                    onClick={() => releaseMutation.mutate()}
                  >
                    Confirmar liberação
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setReleaseDocId(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}

const documentSchema = z.object({
  doc_type: z.enum(['crlv_licenciamento', 'seguro', 'ipva', 'outro']),
  reference: z.string().trim().max(100).optional(),
  issuer: z.string().trim().max(150).optional(),
  valid_until: z.string().trim().optional(),
  cost: z.coerce.number().min(0).optional().or(z.literal('').transform(() => undefined)),
});

type DocumentFormData = z.infer<typeof documentSchema>;

function NewVehicleDocumentForm({ assetId, onDone }: { assetId: number; onDone: () => void }) {
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DocumentFormData>({ resolver: zodResolver(documentSchema), defaultValues: { doc_type: 'crlv_licenciamento' } });

  const mutation = useMutation({
    mutationFn: (values: DocumentFormData) => {
      const hasExpiration = values.doc_type !== 'outro' || Boolean(values.valid_until);
      return facilitiesApi.createVehicleDocument(assetId, { ...values, has_expiration: hasExpiration });
    },
    onSuccess: () => {
      setFormError(null);
      onDone();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível cadastrar o documento')),
  });

  return (
    <form className="flex flex-col gap-2 rounded-md border p-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
      <div className="grid grid-cols-3 gap-2">
        <SelectNative {...register('doc_type')}>
          {Object.entries(VEHICLE_DOC_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectNative>
        <Input placeholder="Referência" {...register('reference')} />
        <Input placeholder="Emissor" {...register('issuer')} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input type="date" {...register('valid_until')} />
        <Input type="number" step="0.01" placeholder="Custo (R$)" {...register('cost')} />
      </div>
      {errors.doc_type && <p className="text-sm text-destructive">{errors.doc_type.message}</p>}
      {formError && <DidacticAlert error={formError} />}
      <Button type="submit" size="sm" className="self-start" disabled={isSubmitting || mutation.isPending}>
        Salvar documento
      </Button>
    </form>
  );
}
