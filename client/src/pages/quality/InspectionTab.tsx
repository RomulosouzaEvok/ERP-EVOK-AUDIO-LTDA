import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';

import * as lotsApi from '@/api/lots';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { useAuth } from '@/context/AuthContext';
import { HandoffDot } from '@/components/HandoffDot';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';
import { DidacticAlert } from '@/components/DidacticAlert';
import type { NonConformityPrefill } from './NonConformitiesTab';
import { formatDate } from '@/lib/format';

const STATUS_LABEL: Record<lotsApi.LotStatus, string> = {
  quarantine: 'Em quarentena',
  blocked: 'Bloqueado',
  available: 'Liberado',
  consumed: 'Consumido',
  expired: 'Expirado',
  reserved: 'Reservado',
};

const STATUS_BADGE: Record<lotsApi.LotStatus, BadgeProps['variant']> = {
  quarantine: 'warning',
  blocked: 'destructive',
  available: 'success',
  consumed: 'secondary',
  expired: 'outline',
  reserved: 'secondary',
};

// "Expirado" mantém o variant `outline` (visualmente distinto de "Bloqueado",
// que usa `destructive` sólido), mas recolore borda/texto para o mesmo token
// `--destructive` em vez de um terceiro tom de "atenção" (laranja) — a
// paleta de atenção do sistema fica só em duas cores: âmbar (pendência,
// `warning`) e destructive (crítico/bloqueante).
const STATUS_BADGE_CLASS: Partial<Record<lotsApi.LotStatus, string>> = {
  expired: 'border-destructive text-destructive',
};


/** Aba A: inspeção de recebimento — lotes em quarentena aguardando liberação/bloqueio da qualidade. */
export function InspectionTab({
  onOpenNonConformity,
}: {
  onOpenNonConformity: (prefill: NonConformityPrefill) => void;
}) {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = React.useState<lotsApi.LotStatus>('quarantine');
  const [page, setPage] = React.useState(1);
  const [releasingLot, setReleasingLot] = React.useState<lotsApi.Lot | null>(null);
  const [blockingLot, setBlockingLot] = React.useState<lotsApi.Lot | null>(null);
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['quality-lots', statusFilter, page],
    queryFn: () => lotsApi.listLots({ status: statusFilter, page, limit: 20 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['quality-lots'] });

  const releaseMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) => lotsApi.releaseLot(id, notes),
    onSuccess: () => {
      invalidate();
      setReleasingLot(null);
      setActionError(null);
    },
    onError: (error) =>
      setActionError(translateApiError(error, 'Não foi possível liberar o lote', 'release-lot')),
  });

  const blockMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string; openRnc: boolean }) => lotsApi.blockLot(id, reason),
    onSuccess: (lot, variables) => {
      invalidate();
      setActionError(null);
      if (variables.openRnc) {
        onOpenNonConformity({
          product_id: lot.product_id,
          product_label: lot.product ? `${lot.product.code} — ${lot.product.name}` : undefined,
          supplier_id: lot.supplier_id ?? undefined,
          lot_number: lot.lot_number,
          description: `Lote ${lot.lot_number} reprovado na inspeção de recebimento: ${variables.reason}`,
          origin: 'incoming',
        });
      }
      setBlockingLot(null);
    },
    onError: (error) =>
      setActionError(translateApiError(error, 'Não foi possível bloquear o lote', 'release-lot')),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Label htmlFor="lot-status-filter" className="text-sm text-muted-foreground">
          Status
        </Label>
        <SelectNative
          id="lot-status-filter"
          className="max-w-52"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as lotsApi.LotStatus);
            setPage(1);
          }}
        >
          <option value="quarantine">Em quarentena</option>
          <option value="blocked">Bloqueado</option>
          <option value="available">Liberado</option>
        </SelectNative>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-6" />
            <TableHead>Lote</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Qtd. inicial</TableHead>
            <TableHead>Qtd. disponível</TableHead>
            <TableHead>Recebido em</TableHead>
            <TableHead>Validade</TableHead>
            <TableHead>Status</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={canWrite ? 10 : 9} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={canWrite ? 10 : 9} className="text-center text-destructive">
                Não foi possível carregar os lotes. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((lot) => (
            <TableRow key={lot.id}>
              <TableCell>{lot.handoff_signal && <HandoffDot signal={lot.handoff_signal} />}</TableCell>
              <TableCell className="font-medium">{lot.lot_number}</TableCell>
              <TableCell>{lot.product ? `${lot.product.code} — ${lot.product.name}` : lot.product_id}</TableCell>
              <TableCell>{lot.supplier?.company_name ?? '-'}</TableCell>
              <TableCell>{Number(lot.quantity_initial)}</TableCell>
              <TableCell>{Number(lot.quantity_available)}</TableCell>
              <TableCell>{formatDate(lot.received_at)}</TableCell>
              <TableCell>{formatDate(lot.expires_at)}</TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE[lot.status]} className={STATUS_BADGE_CLASS[lot.status]}>
                  {STATUS_LABEL[lot.status]}
                </Badge>
              </TableCell>
              {canWrite && (
                <TableCell className="flex gap-2">
                  {(lot.status === 'quarantine' || lot.status === 'blocked') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-success/40 text-success hover:bg-success/10 hover:text-success dark:border-success/50 dark:hover:bg-success/15"
                      onClick={() => setReleasingLot(lot)}
                    >
                      <CheckCircle2 className="size-4" /> Aprovar
                    </Button>
                  )}
                  {(lot.status === 'quarantine' || lot.status === 'available') && (
                    <Button size="sm" variant="destructive" onClick={() => setBlockingLot(lot)}>
                      <XCircle className="size-4" /> Reprovar
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={canWrite ? 10 : 9} className="text-center text-muted-foreground">
                Nenhum lote encontrado para este status.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <ReleaseLotDialog
        lot={releasingLot}
        error={actionError}
        isPending={releaseMutation.isPending}
        onClose={() => {
          setReleasingLot(null);
          setActionError(null);
        }}
        onConfirm={(notes) => releaseMutation.mutate({ id: releasingLot!.id, notes })}
      />

      <BlockLotDialog
        lot={blockingLot}
        error={actionError}
        isPending={blockMutation.isPending}
        onClose={() => {
          setBlockingLot(null);
          setActionError(null);
        }}
        onConfirm={(reason, openRnc) => blockMutation.mutate({ id: blockingLot!.id, reason, openRnc })}
      />
    </div>
  );
}

function ReleaseLotDialog({
  lot,
  error,
  isPending,
  onClose,
  onConfirm,
}: {
  lot: lotsApi.Lot | null;
  error: DidacticError | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (notes?: string) => void;
}) {
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    if (lot) setNotes('');
  }, [lot]);

  return (
    <Dialog open={Boolean(lot)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprovar (liberar) lote {lot?.lot_number}</DialogTitle>
          <DialogDescription>
            O lote será liberado para consumo/expedição. Confirme a aprovação da inspeção de recebimento.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="release-notes">Observações (opcional)</Label>
          <textarea
            id="release-notes"
            className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Ex.: Conforme laudo de inspeção nº..."
          />
        </div>

        {error && <DidacticAlert error={error} />}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(notes || undefined)} disabled={isPending}>
            {isPending ? 'Liberando...' : 'Confirmar liberação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BlockLotDialog({
  lot,
  error,
  isPending,
  onClose,
  onConfirm,
}: {
  lot: lotsApi.Lot | null;
  error: DidacticError | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (reason: string, openRnc: boolean) => void;
}) {
  const [reason, setReason] = React.useState('');
  const [openRnc, setOpenRnc] = React.useState(true);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (lot) {
      setReason('');
      setOpenRnc(true);
      setValidationError(null);
    }
  }, [lot]);

  const handleConfirm = () => {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setValidationError('Informe um motivo com ao menos 3 caracteres.');
      return;
    }
    setValidationError(null);
    onConfirm(trimmed, openRnc);
  };

  return (
    <Dialog open={Boolean(lot)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reprovar (bloquear) lote {lot?.lot_number}</DialogTitle>
          <DialogDescription>
            O lote ficará indisponível para consumo/expedição até nova liberação da qualidade.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="block-reason">Motivo do bloqueio *</Label>
          <textarea
            id="block-reason"
            className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex.: Divergência dimensional constatada na inspeção."
          />
          {validationError && <p className="text-sm text-destructive">{validationError}</p>}
        </div>

        <div className="flex items-center gap-2">
          <input
            id="open-rnc"
            type="checkbox"
            className="size-4"
            checked={openRnc}
            onChange={(event) => setOpenRnc(event.target.checked)}
          />
          <Label htmlFor="open-rnc" className="font-normal">
            Abrir RNC (não-conformidade) com estes dados pré-preenchidos
          </Label>
        </div>

        {error && <DidacticAlert error={error} />}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Bloqueando...' : 'Confirmar bloqueio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
