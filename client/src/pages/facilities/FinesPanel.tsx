import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Plus } from 'lucide-react';

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
import { FineIndicationBadge, FineStatusBadge, formatCurrency, formatDate } from './facilitiesShared';

/** Painel "Multas" (dentro da aba Frota) — UC-59, semáforo de prazo legal de indicação de condutor (CTB Art. 257 §7º). */
export function FinesPanel() {
  const { permissions, hasRole } = useAuth();
  const canWrite = hasRole('admin') || permissions?.facilities === 'operate' || permissions?.facilities === 'approve';
  const [statusFilter, setStatusFilter] = React.useState<facilitiesApi.FineStatus | ''>('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['facility-fines', statusFilter],
    queryFn: () => facilitiesApi.listFines({ status: statusFilter || undefined, limit: 100 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fine-status-filter" className="text-sm text-muted-foreground">
            Status
          </Label>
          <SelectNative
            id="fine-status-filter"
            className="max-w-48"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as facilitiesApi.FineStatus | '')}
          >
            <option value="">Todos</option>
            <option value="open">Aberta</option>
            <option value="paid">Paga</option>
            <option value="appealed">Recorrida</option>
            <option value="canceled">Cancelada</option>
          </SelectNative>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nova multa
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Veículo</TableHead>
            <TableHead>Infração</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Prazo de indicação</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-destructive">
                Não foi possível carregar as multas. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((fine) => (
            <TableRow key={fine.id}>
              <TableCell className="font-mono text-xs">#{fine.asset_id}</TableCell>
              <TableCell className="text-xs">{fine.infraction_code} — {formatDate(fine.infraction_at)}</TableCell>
              <TableCell className="tabular-nums">{formatCurrency(fine.amount)}</TableCell>
              <TableCell>
                <FineIndicationBadge status={fine.indication_status} deadline={fine.indication_deadline} />
              </TableCell>
              <TableCell>
                <FineStatusBadge status={fine.status} />
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => setDetailId(fine.id)}>
                  Detalhe
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <AlertTriangle className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhuma multa registrada.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <CreateFineDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => setDetailId(id)} />
      <FineDetailDialog fineId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

const fineSchema = z.object({
  asset_id: z.coerce.number().int().positive('Informe o ID do veículo (asset).'),
  infraction_at: z.string().trim().min(1, 'Informe a data/hora da infração.'),
  location: z.string().trim().max(200).optional(),
  infraction_code: z.string().trim().min(1, 'Informe o código da infração.').max(20),
  description: z.string().trim().max(2000).optional(),
  amount: z.coerce.number().positive('Informe o valor da multa.'),
  points: z.coerce.number().int().min(0).max(20).optional().or(z.literal('').transform(() => undefined)),
  notice_received_at: z.string().trim().optional(),
});

type FineFormData = z.infer<typeof fineSchema>;

function CreateFineDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof fineSchema>, unknown, FineFormData>({ resolver: zodResolver(fineSchema) });

  const mutation = useMutation({
    mutationFn: (values: FineFormData) => facilitiesApi.createFine(values),
    onSuccess: (fine) => {
      queryClient.invalidateQueries({ queryKey: ['facility-fines'] });
      setFormError(null);
      onCreated(fine.id);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível registrar a multa')),
  });

  React.useEffect(() => {
    if (open) {
      reset({});
      setFormError(null);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova multa</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fine-asset">ID do veículo (asset) *</Label>
              <Input id="fine-asset" type="number" {...register('asset_id')} />
              {errors.asset_id && <p className="text-sm text-destructive">{errors.asset_id.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fine-infraction-at">Data/hora da infração *</Label>
              <Input id="fine-infraction-at" type="datetime-local" {...register('infraction_at')} />
              {errors.infraction_at && <p className="text-sm text-destructive">{errors.infraction_at.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fine-code">Código da infração *</Label>
              <Input id="fine-code" {...register('infraction_code')} />
              {errors.infraction_code && <p className="text-sm text-destructive">{errors.infraction_code.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fine-amount">Valor (R$) *</Label>
              <Input id="fine-amount" type="number" step="0.01" {...register('amount')} />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fine-location">Local</Label>
            <Input id="fine-location" {...register('location')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fine-points">Pontos</Label>
              <Input id="fine-points" type="number" {...register('points')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fine-notice">Data de recebimento da notificação</Label>
              <Input id="fine-notice" type="date" {...register('notice_received_at')} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            O prazo de indicação de condutor (30 dias por padrão) é calculado automaticamente a partir da data de recebimento da notificação.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fine-description">Descrição</Label>
            <Input id="fine-description" {...register('description')} />
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Registrar multa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FineDetailDialog({ fineId, onClose }: { fineId: number | null; onClose: () => void }) {
  const { permissions, hasRole } = useAuth();
  const canApprove = hasRole('admin') || permissions?.facilities === 'approve';
  const queryClient = useQueryClient();
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);
  const [identifiedDriverId, setIdentifiedDriverId] = React.useState('');
  const [indicatedAt, setIndicatedAt] = React.useState('');
  const [protocolNumber, setProtocolNumber] = React.useState('');
  const [paymentDate, setPaymentDate] = React.useState('');
  const [financialRef, setFinancialRef] = React.useState('');

  const { data: fine, isLoading } = useQuery({
    queryKey: ['facility-fine-detail', fineId],
    queryFn: () => facilitiesApi.getFine(fineId!),
    enabled: fineId != null,
  });

  const { data: suggestion } = useQuery({
    queryKey: ['facility-fine-suggested-driver', fineId],
    queryFn: () => facilitiesApi.getSuggestedFineDriver(fineId!),
    enabled: fineId != null && fine?.indication_status === 'pending',
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['facility-fine-detail', fineId] });
    queryClient.invalidateQueries({ queryKey: ['facility-fines'] });
  };

  function useAction<TArgs>(fn: (args: TArgs) => Promise<unknown>, title: string) {
    return useMutation({
      mutationFn: fn,
      onSuccess: () => {
        setActionError(null);
        invalidate();
      },
      onError: (error) => setActionError(translateApiError(error, title)),
    });
  }

  const indicateMutation = useAction(
    () =>
      facilitiesApi.indicateFineDriver(fineId!, {
        identified_driver_id: Number(identifiedDriverId),
        indicated_at: indicatedAt,
        protocol_number: protocolNumber || undefined,
      }),
    'Não foi possível confirmar a indicação de condutor',
  );
  const appealMutation = useAction(() => facilitiesApi.appealFine(fineId!), 'Não foi possível marcar a multa como recorrida');
  const payMutation = useAction(
    () => facilitiesApi.payFine(fineId!, { payment_date: paymentDate }),
    'Não foi possível registrar o pagamento da multa',
  );
  const chargeDriverMutation = useAction(
    () => facilitiesApi.chargeDriverFine(fineId!, financialRef),
    'Não foi possível registrar o repasse ao condutor',
  );

  React.useEffect(() => {
    if (fineId != null) {
      setActionError(null);
      setIdentifiedDriverId('');
      setIndicatedAt('');
      setProtocolNumber('');
      setPaymentDate('');
      setFinancialRef('');
    }
  }, [fineId]);

  React.useEffect(() => {
    if (suggestion?.suggested_driver_id) setIdentifiedDriverId(String(suggestion.suggested_driver_id));
  }, [suggestion]);

  return (
    <Dialog open={fineId != null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Multa #{fineId}</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {fine && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <FineStatusBadge status={fine.status} />
              <FineIndicationBadge status={fine.indication_status} deadline={fine.indication_deadline} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>Veículo: #{fine.asset_id}</span>
              <span>Valor: {formatCurrency(fine.amount)}</span>
              <span>Infração: {formatDate(fine.infraction_at)}</span>
              <span>Prazo de indicação: {formatDate(fine.indication_deadline)}</span>
              <span>Condutor indicado: {fine.identified_driver_id ? `#${fine.identified_driver_id}` : '-'}</span>
              <span>Cobrança ao condutor: {fine.charge_to_driver ? 'Sim' : 'Não'}</span>
            </div>

            {actionError && <DidacticAlert error={actionError} />}

            {fine.indication_status === 'pending' && canApprove && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-semibold">Confirmar indicação de condutor</p>
                {suggestion?.suggested_driver_id && (
                  <p className="text-xs text-muted-foreground">
                    Sugestão automática (cruzamento com diário de uso): condutor #{suggestion.suggested_driver_id}.
                  </p>
                )}
                <Input placeholder="ID do condutor identificado *" type="number" value={identifiedDriverId} onChange={(e) => setIdentifiedDriverId(e.target.value)} />
                <Input placeholder="Data da indicação *" type="date" value={indicatedAt} onChange={(e) => setIndicatedAt(e.target.value)} />
                <Input placeholder="Nº do protocolo" value={protocolNumber} onChange={(e) => setProtocolNumber(e.target.value)} />
                <Button
                  size="sm"
                  className="self-start"
                  disabled={!identifiedDriverId || !indicatedAt || indicateMutation.isPending}
                  onClick={() => indicateMutation.mutate(undefined)}
                >
                  Confirmar indicação
                </Button>
              </div>
            )}
            {fine.indication_status === 'pending' && !canApprove && (
              <p className="text-xs text-muted-foreground">Confirmar indicação exige nível de aprovação (approve) no módulo Facilities.</p>
            )}

            {fine.status === 'open' && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={appealMutation.isPending} onClick={() => appealMutation.mutate(undefined)}>
                  Marcar como recorrida
                </Button>
              </div>
            )}

            {fine.status === 'open' && canApprove && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-semibold">Registrar pagamento (gera título em Contas a Pagar)</p>
                <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                <Button size="sm" className="self-start" disabled={!paymentDate || payMutation.isPending} onClick={() => payMutation.mutate(undefined)}>
                  Confirmar pagamento
                </Button>
              </div>
            )}

            {!fine.charge_to_driver && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-semibold">Registrar repasse ao condutor</p>
                <Input placeholder="Referência financeira (RH/Financeiro) *" value={financialRef} onChange={(e) => setFinancialRef(e.target.value)} />
                <Button
                  size="sm"
                  variant="outline"
                  className="self-start"
                  disabled={!financialRef.trim() || chargeDriverMutation.isPending}
                  onClick={() => chargeDriverMutation.mutate(undefined)}
                >
                  Registrar repasse
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
