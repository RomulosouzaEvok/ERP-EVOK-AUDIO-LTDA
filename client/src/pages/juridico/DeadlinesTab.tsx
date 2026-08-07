import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Clock, Plus } from 'lucide-react';

import * as jurApi from '@/api/juridico';
import { useAuth } from '@/context/AuthContext';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DEADLINE_STATUS_LABELS, DeadlineStatusBadge, UrgencyBadge, formatDate, formatDateTime } from './juridicoShared';

/**
 * Aba Prazos Fatais — `/juridico`, UC-54, fluxo mais crítico do módulo:
 * semáforo de urgência, dupla confirmação (`fulfill` → `confirm`, sempre
 * usuários distintos) e criação exigindo `responsible_user_id`/
 * `escalation_user_id` sem exceção. Não existe (nem aqui, nem na API)
 * caminho para desativar um alerta de prazo fatal — RNF-JUR-04.
 */
export function DeadlinesTab() {
  const [statusFilter, setStatusFilter] = React.useState<jurApi.DeadlineStatus | ''>('');
  const [criticalOnly, setCriticalOnly] = React.useState(false);
  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  const { data: listData, isLoading: isListLoading, isError: isListError } = useQuery({
    queryKey: ['jur-deadlines', statusFilter],
    queryFn: () => jurApi.listDeadlines({ status: statusFilter || undefined, limit: 50 }),
    enabled: !criticalOnly,
  });

  const { data: criticalData, isLoading: isCriticalLoading, isError: isCriticalError } = useQuery({
    queryKey: ['jur-deadlines-critical'],
    queryFn: () => jurApi.listCriticalDeadlines(),
    enabled: criticalOnly,
  });

  const rows = criticalOnly ? criticalData : listData?.data;
  const isLoading = criticalOnly ? isCriticalLoading : isListLoading;
  const isError = criticalOnly ? isCriticalError : isListError;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm text-muted-foreground">Status</Label>
            <SelectNative
              className="max-w-56"
              value={statusFilter}
              disabled={criticalOnly}
              onChange={(e) => setStatusFilter(e.target.value as jurApi.DeadlineStatus | '')}
            >
              <option value="">Todos</option>
              {Object.entries(DEADLINE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectNative>
          </div>
          <Button type="button" variant={criticalOnly ? 'default' : 'outline'} size="sm" onClick={() => setCriticalOnly((v) => !v)}>
            <AlertTriangle className="size-4" />
            Só críticos (≤3 dias / vencidos)
          </Button>
        </div>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Novo prazo
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Processo</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Urgência</TableHead>
            <TableHead>Fatal</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={7} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-destructive">
                Não foi possível carregar os prazos.
              </TableCell>
            </TableRow>
          )}
          {rows?.map((deadline) => (
            <TableRow key={deadline.id} className="border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5">
              <TableCell className="font-mono text-xs">{deadline.legalCase?.case_number ?? `#${deadline.legal_case_id}`}</TableCell>
              <TableCell className="max-w-64 truncate" title={deadline.description}>
                {deadline.description}
              </TableCell>
              <TableCell>{formatDate(deadline.due_date)}</TableCell>
              <TableCell>
                <UrgencyBadge dueDate={deadline.due_date} status={deadline.status} />
              </TableCell>
              <TableCell>{deadline.is_fatal ? 'Sim' : 'Não'}</TableCell>
              <TableCell>
                <DeadlineStatusBadge status={deadline.status} />
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => setDetailId(deadline.id)}>
                  Detalhes
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && rows?.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Clock className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum prazo encontrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <CreateDeadlineDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => setDetailId(id)} />
      <DeadlineDetailDialog deadlineId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function CreateDeadlineDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [legalCaseId, setLegalCaseId] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [isFatal, setIsFatal] = React.useState(true);
  const [responsibleUserId, setResponsibleUserId] = React.useState('');
  const [backupUserId, setBackupUserId] = React.useState('');
  const [escalationUserId, setEscalationUserId] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setError(null);
      setLegalCaseId('');
      setDescription('');
      setDueDate('');
      setIsFatal(true);
      setResponsibleUserId('');
      setBackupUserId('');
      setEscalationUserId('');
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: () =>
      jurApi.createDeadline(Number(legalCaseId), {
        description,
        due_date: dueDate,
        is_fatal: isFatal,
        responsible_user_id: Number(responsibleUserId),
        backup_user_id: backupUserId ? Number(backupUserId) : undefined,
        escalation_user_id: escalationUserId ? Number(escalationUserId) : undefined,
      }),
    onSuccess: (deadline) => {
      queryClient.invalidateQueries({ queryKey: ['jur-deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['jur-deadlines-critical'] });
      onCreated(deadline.id);
      onClose();
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível salvar o prazo processual')),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo prazo processual</DialogTitle>
        </DialogHeader>

        {error && <DidacticAlert error={error} />}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>ID do processo (legal_case_id)</Label>
            <Input type="number" value={legalCaseId} onChange={(e) => setLegalCaseId(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Data fatal (informada manualmente — o sistema não calcula)</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 self-end pb-1.5">
              <input type="checkbox" id="is_fatal" checked={isFatal} onChange={(e) => setIsFatal(e.target.checked)} />
              <Label htmlFor="is_fatal" className="text-sm">
                Prazo fatal
              </Label>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Responsável (obrigatório)</Label>
              <Input type="number" value={responsibleUserId} onChange={(e) => setResponsibleUserId(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Backup</Label>
              <Input type="number" value={backupUserId} onChange={(e) => setBackupUserId(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Escalonamento {isFatal && '(obrigatório se fatal)'}</Label>
              <Input type="number" value={escalationUserId} onChange={(e) => setEscalationUserId(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!legalCaseId || !description.trim() || !dueDate || !responsibleUserId || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Salvar prazo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeadlineDetailDialog({ deadlineId, onClose }: { deadlineId: number | null; onClose: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [evidencePath, setEvidencePath] = React.useState('');
  const [retroactiveJustification, setRetroactiveJustification] = React.useState('');

  const { data: deadline, isLoading } = useQuery({
    queryKey: ['jur-deadline-detail', deadlineId],
    queryFn: () => jurApi.getDeadline(deadlineId!),
    enabled: deadlineId != null,
  });

  React.useEffect(() => {
    if (deadlineId != null) {
      setError(null);
      setEvidencePath('');
      setRetroactiveJustification('');
    }
  }, [deadlineId]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['jur-deadline-detail', deadlineId] });
    queryClient.invalidateQueries({ queryKey: ['jur-deadlines'] });
    queryClient.invalidateQueries({ queryKey: ['jur-deadlines-critical'] });
  };

  function useAction<TArgs>(fn: (args: TArgs) => Promise<unknown>, title: string) {
    return useMutation({
      mutationFn: fn,
      onSuccess: () => {
        setError(null);
        invalidate();
      },
      onError: (err) => setError(translateApiError(err, title)),
    });
  }

  const acknowledgeMutation = useAction(() => jurApi.acknowledgeDeadline(deadlineId!), 'Não foi possível reconhecer o alerta');
  const fulfillMutation = useAction(
    () => jurApi.fulfillDeadline(deadlineId!, { evidence_file_path: evidencePath, retroactive_justification: retroactiveJustification || null }),
    'Não foi possível registrar o cumprimento do prazo',
  );
  const confirmMutation = useAction(() => jurApi.confirmDeadline(deadlineId!), 'Não foi possível confirmar a baixa do prazo');

  const isMissed = deadline?.status === 'missed';
  const isSameUserAsFulfiller = deadline?.fulfilled_by != null && user?.id === deadline.fulfilled_by;

  return (
    <Dialog open={deadlineId != null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Prazo processual</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {deadline && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <DeadlineStatusBadge status={deadline.status} />
              <UrgencyBadge dueDate={deadline.due_date} status={deadline.status} />
              <span className="text-xs text-muted-foreground">Vencimento: {formatDate(deadline.due_date)}</span>
            </div>
            <p className="text-sm">{deadline.description}</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>Responsável: #{deadline.responsible_user_id}</span>
              <span>Backup: {deadline.backup_user_id ? `#${deadline.backup_user_id}` : '-'}</span>
              <span>Reconhecido em: {formatDateTime(deadline.acknowledged_at)}</span>
              <span>Escalonamento: {deadline.escalation_user_id ? `#${deadline.escalation_user_id}` : '-'}</span>
            </div>

            {error && <DidacticAlert error={error} />}

            {deadline.status === 'pending' && (
              <Button type="button" size="sm" variant="outline" disabled={acknowledgeMutation.isPending} onClick={() => acknowledgeMutation.mutate(undefined)}>
                Reconhecer alerta (evita escalonamento em D-3)
              </Button>
            )}

            {(deadline.status === 'pending' || deadline.status === 'missed') && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-semibold">1ª confirmação — registrar cumprimento com evidência</p>
                <Input placeholder="URL/caminho do protocolo (evidência)" value={evidencePath} onChange={(e) => setEvidencePath(e.target.value)} />
                {isMissed && (
                  <Input
                    placeholder="Justificativa retroativa (obrigatória — prazo já vencido)"
                    value={retroactiveJustification}
                    onChange={(e) => setRetroactiveJustification(e.target.value)}
                  />
                )}
                <Button
                  size="sm"
                  className="self-start"
                  disabled={!evidencePath.trim() || (isMissed && !retroactiveJustification.trim()) || fulfillMutation.isPending}
                  onClick={() => fulfillMutation.mutate(undefined)}
                >
                  Registrar cumprimento
                </Button>
              </div>
            )}

            {deadline.status === 'fulfilled_pending_confirmation' && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-semibold">2ª confirmação — exige um segundo usuário</p>
                <p className="text-xs text-muted-foreground">
                  Cumprido por: #{deadline.fulfilled_by} em {formatDateTime(deadline.fulfilled_at)}.
                </p>
                {isSameUserAsFulfiller && (
                  <p className="text-xs text-destructive">
                    Você foi quem registrou o cumprimento — a confirmação exige um usuário diferente (BR-JUR-013).
                  </p>
                )}
                <Button
                  size="sm"
                  className="self-start"
                  disabled={isSameUserAsFulfiller || confirmMutation.isPending}
                  onClick={() => confirmMutation.mutate(undefined)}
                >
                  Confirmar baixa
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
