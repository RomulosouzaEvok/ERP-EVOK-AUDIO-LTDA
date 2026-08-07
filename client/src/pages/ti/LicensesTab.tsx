import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Eye, EyeOff, KeyRound, Plus, ShieldCheck, Users } from 'lucide-react';

import * as tiApi from '@/api/ti';
import * as employeesApi from '@/api/employees';
import * as assetsApi from '@/api/assets';
import { useAuth } from '@/context/AuthContext';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { AmberNoticeBox } from '@/components/AmberNoticeBox';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/Textarea';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDate } from './tiShared';

/** Licenças de Software (P3) — `/ti`, aba "Licenças". */
export function LicensesTab() {
  const { user, permissions } = useAuth();
  const canApprove = user?.role === 'admin' || permissions?.ti === 'approve';
  const [newLicenseOpen, setNewLicenseOpen] = React.useState(false);
  const [seatsAssetId, setSeatsAssetId] = React.useState<number | null>(null);
  const [renewalAssetId, setRenewalAssetId] = React.useState<number | null>(null);
  const [revealError, setRevealError] = React.useState<DidacticError | null>(null);
  const [revealed, setRevealed] = React.useState<Record<number, string>>({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ti-licenses'],
    queryFn: () => tiApi.listLicenses({ limit: 100 }),
  });

  const { data: expiring } = useQuery({
    queryKey: ['ti-licenses-expiring'],
    queryFn: tiApi.listExpiringLicenses,
  });

  const revealMutation = useMutation({
    mutationFn: (assetId: number) => tiApi.revealLicenseKey(assetId),
    onSuccess: (key, assetId) => {
      setRevealed((prev) => ({ ...prev, [assetId]: key }));
      setRevealError(null);
    },
    onError: (error) => setRevealError(translateApiError(error, 'Não foi possível exibir a chave de licença')),
  });

  return (
    <div className="flex flex-col gap-4">
      {Boolean(expiring?.length) && (
        <AmberNoticeBox icon={AlertTriangle} className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
          <p className="font-semibold">{expiring?.length} licença(s) próxima(s) do vencimento</p>
          <p className="text-xs">
            {expiring?.slice(0, 5).map((entry) => `${entry.name} (${entry.days_remaining}d)`).join(', ')}
            {(expiring?.length ?? 0) > 5 ? '…' : ''}
          </p>
        </AmberNoticeBox>
      )}

      {revealError && <DidacticAlert error={revealError} />}

      <div className="flex justify-end">
        <Button type="button" onClick={() => setNewLicenseOpen(true)}>
          <Plus className="size-4" />
          Nova licença
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Software</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Assentos</TableHead>
            <TableHead>Chave</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={8} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-destructive">
                Não foi possível carregar as licenças.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((license) => (
            <TableRow key={license.asset_id} className="border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5">
              <TableCell>{license.name}</TableCell>
              <TableCell>{license.vendor}</TableCell>
              <TableCell>{license.license_type}</TableCell>
              <TableCell className="text-right tabular-nums">
                {license.seats_allocated ?? 0} / {license.seats}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {revealed[license.asset_id] ?? license.license_key_masked ?? '-'}
              </TableCell>
              <TableCell>{formatDate(license.license_expires_at)}</TableCell>
              <TableCell>
                <LicenseStatusBadge status={license.status_derivado} />
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={revealMutation.isPending}
                    onClick={() =>
                      revealed[license.asset_id]
                        ? setRevealed((prev) => {
                            const next = { ...prev };
                            delete next[license.asset_id];
                            return next;
                          })
                        : revealMutation.mutate(license.asset_id)
                    }
                  >
                    {revealed[license.asset_id] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSeatsAssetId(license.asset_id)}>
                    <Users className="size-4" />
                    Assentos
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canApprove}
                    title={!canApprove ? 'Requer nível approve no módulo TI' : undefined}
                    onClick={() => setRenewalAssetId(license.asset_id)}
                  >
                    <KeyRound className="size-4" />
                    Renovação
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhuma licença cadastrada.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <NewLicenseDialog open={newLicenseOpen} onClose={() => setNewLicenseOpen(false)} />
      <SeatsDialog assetId={seatsAssetId} onClose={() => setSeatsAssetId(null)} />
      <RenewalDialog assetId={renewalAssetId} onClose={() => setRenewalAssetId(null)} />
    </div>
  );
}

function LicenseStatusBadge({ status }: { status: tiApi.LicenseStatusDerivado }) {
  if (status === 'active') return <Badge variant="success">Ativa</Badge>;
  if (status === 'expiring') return <Badge variant="warning">Vencendo</Badge>;
  if (status === 'expired') return <Badge variant="destructive">Vencida</Badge>;
  return <Badge variant="outline">Sem data</Badge>;
}

const newLicenseSchema = z.object({
  asset_id: z.coerce.number().int().positive('Selecione o ativo (licença).'),
  vendor: z.string().min(1, 'Informe o fornecedor.'),
  license_type: z.enum(['perpetual', 'subscription', 'free']),
  seats: z.coerce.number().int().positive('Informe o número de assentos.'),
  cost: z.coerce.number().nonnegative('Informe o custo.'),
  billing_cycle: z.enum(['monthly', 'yearly', 'one_time']),
  license_key: z.string().optional(),
  renewal_date: z.string().optional(),
});

type NewLicenseFormData = z.infer<typeof newLicenseSchema>;

function NewLicenseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const { data: assets } = useQuery({
    queryKey: ['ti-license-assets-select'],
    queryFn: () => assetsApi.listAssets({ limit: 200 }),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewLicenseFormData>({
    resolver: zodResolver(newLicenseSchema),
    defaultValues: { license_type: 'subscription', billing_cycle: 'yearly' },
  });

  const mutation = useMutation({
    mutationFn: (values: NewLicenseFormData) => tiApi.createLicense(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ti-licenses'] });
      reset({ license_type: 'subscription', billing_cycle: 'yearly' } as never);
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível cadastrar a licença')),
  });

  React.useEffect(() => {
    if (open) {
      reset({ license_type: 'subscription', billing_cycle: 'yearly' } as never);
      setFormError(null);
    }
  }, [open, reset]);

  const licenseAssetOptions = (assets?.data ?? []).filter((asset) => asset.asset_type === 'license');

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova licença de software</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <p className="text-xs text-muted-foreground">
            O ativo (asset_type=&quot;license&quot;) precisa já existir em Patrimônio antes de estender aqui.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="license-asset">Ativo (licença)</Label>
            <SelectNative id="license-asset" {...register('asset_id')}>
              <option value="">Selecione...</option>
              {licenseAssetOptions.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.tag} — {asset.name}
                </option>
              ))}
            </SelectNative>
            {errors.asset_id && <p className="text-sm text-destructive">{errors.asset_id.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="license-vendor">Fornecedor</Label>
              <Input id="license-vendor" {...register('vendor')} />
              {errors.vendor && <p className="text-sm text-destructive">{errors.vendor.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="license-type">Tipo</Label>
              <SelectNative id="license-type" {...register('license_type')}>
                <option value="perpetual">Perpétua</option>
                <option value="subscription">Assinatura</option>
                <option value="free">Gratuita</option>
              </SelectNative>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="license-seats">Assentos</Label>
              <Input id="license-seats" type="number" {...register('seats')} />
              {errors.seats && <p className="text-sm text-destructive">{errors.seats.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="license-cost">Custo</Label>
              <Input id="license-cost" type="number" step="0.01" {...register('cost')} />
              {errors.cost && <p className="text-sm text-destructive">{errors.cost.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="license-cycle">Ciclo</Label>
              <SelectNative id="license-cycle" {...register('billing_cycle')}>
                <option value="monthly">Mensal</option>
                <option value="yearly">Anual</option>
                <option value="one_time">Único</option>
              </SelectNative>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="license-key">Chave de licença</Label>
              <Input id="license-key" {...register('license_key')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="license-renewal">Data de renovação</Label>
              <Input id="license-renewal" type="date" {...register('renewal_date')} />
            </div>
          </div>
          {formError && <DidacticAlert error={formError} />}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SeatsDialog({ assetId, onClose }: { assetId: number | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = React.useState('');
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const { data: seats, isLoading } = useQuery({
    queryKey: ['ti-license-seats', assetId],
    queryFn: () => tiApi.listLicenseSeats(assetId!),
    enabled: assetId != null,
  });
  const { data: employees } = useQuery({
    queryKey: ['employees-active-select'],
    queryFn: () => employeesApi.listEmployees({ limit: 200, status: 'active' }),
    enabled: assetId != null,
  });

  const allocateMutation = useMutation({
    mutationFn: () => tiApi.allocateLicenseSeat(assetId!, Number(employeeId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ti-license-seats', assetId] });
      queryClient.invalidateQueries({ queryKey: ['ti-licenses'] });
      setEmployeeId('');
      setFormError(null);
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível alocar o assento')),
  });

  const revokeMutation = useMutation({
    mutationFn: (seatId: number) => tiApi.revokeLicenseSeat(assetId!, seatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ti-license-seats', assetId] });
      queryClient.invalidateQueries({ queryKey: ['ti-licenses'] });
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível revogar o assento')),
  });

  React.useEffect(() => {
    if (assetId != null) {
      setEmployeeId('');
      setFormError(null);
    }
  }, [assetId]);

  return (
    <Dialog open={assetId != null} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assentos alocados</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          <div className="flex flex-col gap-1.5">
            {(seats ?? []).map((seat) => (
              <div key={seat.id} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
                <span>
                  {'name' in seat.employee ? seat.employee.name : `#${seat.employee.id}`}
                  {seat.revoked_at ? <span className="ml-2 text-xs text-muted-foreground">(revogado)</span> : null}
                </span>
                {!seat.revoked_at && (
                  <Button size="sm" variant="destructive" disabled={revokeMutation.isPending} onClick={() => revokeMutation.mutate(seat.id)}>
                    Revogar
                  </Button>
                )}
              </div>
            ))}
            {!isLoading && (seats?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Nenhum assento alocado.</p>}
          </div>

          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="seat-employee">Alocar novo assento</Label>
              <SelectNative id="seat-employee" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
                <option value="">Selecione o funcionário...</option>
                {(employees?.data ?? []).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </SelectNative>
            </div>
            <Button type="button" disabled={!employeeId || allocateMutation.isPending} onClick={() => allocateMutation.mutate()}>
              Alocar
            </Button>
          </div>

          {formError && <DidacticAlert error={formError} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const renewalSchema = z.object({
  estimated_cost: z.coerce.number().nonnegative('Informe o custo estimado.'),
  justification: z.string().min(1, 'Informe a justificativa.'),
});

type RenewalFormData = z.infer<typeof renewalSchema>;

function RenewalDialog({ assetId, onClose }: { assetId: number | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const [createdRequisitionId, setCreatedRequisitionId] = React.useState<number | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RenewalFormData>({ resolver: zodResolver(renewalSchema) });

  const mutation = useMutation({
    mutationFn: (values: RenewalFormData) => tiApi.requestLicenseRenewal(assetId!, values),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ti-licenses'] });
      setCreatedRequisitionId(data.purchase_requisition_id);
      setFormError(null);
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível solicitar a renovação da licença')),
  });

  React.useEffect(() => {
    if (assetId != null) {
      reset();
      setFormError(null);
      setCreatedRequisitionId(null);
    }
  }, [assetId, reset]);

  return (
    <Dialog open={assetId != null} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar renovação de licença</DialogTitle>
        </DialogHeader>
        {createdRequisitionId != null ? (
          <p className="text-sm text-success">
            Requisição de compra #{createdRequisitionId} criada com sucesso. Acompanhe em Compras &gt; Fila de aprovação.
          </p>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
            <p className="text-xs text-muted-foreground">
              TI nunca compra diretamente — esta ação cria uma Requisição de Compra no fluxo normal de suprimentos.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="renewal-cost">Custo estimado</Label>
              <Input id="renewal-cost" type="number" step="0.01" {...register('estimated_cost')} />
              {errors.estimated_cost && <p className="text-sm text-destructive">{errors.estimated_cost.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="renewal-justification">Justificativa</Label>
              <Textarea id="renewal-justification" rows={2} {...register('justification')} />
              {errors.justification && <p className="text-sm text-destructive">{errors.justification.message}</p>}
            </div>
            {formError && <DidacticAlert error={formError} />}
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting || mutation.isPending}>
                {mutation.isPending ? 'Enviando...' : 'Solicitar renovação'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
