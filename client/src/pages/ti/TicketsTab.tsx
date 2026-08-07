import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, LifeBuoy, MessageSquare, Wrench } from 'lucide-react';

import * as tiApi from '@/api/ti';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/Textarea';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  formatDateTime,
  TICKET_STATUS_LABELS,
  TicketPriorityBadge,
  TicketStatusBadge,
} from './tiShared';

/**
 * Fila de Chamados (gestão, ti:operate) — `/ti`, aba "Fila de Chamados".
 * Diferente de `MyTicketsPage`, aqui é a visão de terceiros: triagem,
 * atribuição, prioridade com histórico, waiting/resume, vínculo com OM,
 * resolução e cancelamento.
 */
export function TicketsTab() {
  const [statusFilter, setStatusFilter] = React.useState<tiApi.TicketStatus | ''>('');
  const [slaOverdueOnly, setSlaOverdueOnly] = React.useState(false);
  const [detailTicketId, setDetailTicketId] = React.useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ti-tickets-queue', statusFilter, slaOverdueOnly],
    queryFn: () => tiApi.listTickets({ status: statusFilter || undefined, sla_overdue: slaOverdueOnly || undefined, limit: 50 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="queue-status-filter" className="text-sm text-muted-foreground">
              Status
            </Label>
            <SelectNative
              id="queue-status-filter"
              className="max-w-52"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as tiApi.TicketStatus | '')}
            >
              <option value="">Todos</option>
              {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectNative>
          </div>
          <Button
            type="button"
            variant={slaOverdueOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSlaOverdueOnly((prev) => !prev)}
          >
            <AlertTriangle className="size-4" />
            SLA estourado
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nº</TableHead>
            <TableHead>Assunto</TableHead>
            <TableHead>Solicitante</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>SLA</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={8} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-destructive">
                Não foi possível carregar a fila de chamados.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((ticket) => (
            <TableRow key={ticket.id} className="border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5">
              <TableCell className="font-mono text-xs">{ticket.ticket_number}</TableCell>
              <TableCell>{ticket.subject}</TableCell>
              <TableCell>{ticket.requester?.name ?? '-'}</TableCell>
              <TableCell>{ticket.assigned_to?.name ?? '-'}</TableCell>
              <TableCell>
                <TicketPriorityBadge priority={ticket.priority} />
              </TableCell>
              <TableCell>
                <TicketStatusBadge status={ticket.status} />
              </TableCell>
              <TableCell>
                {ticket.sla_overdue ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                    <AlertTriangle className="size-3.5" /> Estourado
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Em dia</span>
                )}
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => setDetailTicketId(ticket.id)}>
                  Atender
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <LifeBuoy className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum chamado encontrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <TicketManagementDialog ticketId={detailTicketId} onClose={() => setDetailTicketId(null)} />
    </div>
  );
}

function TicketManagementDialog({ ticketId, onClose }: { ticketId: number | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);
  const [commentText, setCommentText] = React.useState('');
  const [isInternalComment, setIsInternalComment] = React.useState(true);
  const [solutionText, setSolutionText] = React.useState('');
  const [priorityDraft, setPriorityDraft] = React.useState<tiApi.TicketPriority>('medium');
  const [priorityReason, setPriorityReason] = React.useState('');

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ti-ticket-detail', ticketId],
    queryFn: () => tiApi.getTicket(ticketId!),
    enabled: ticketId != null,
  });

  React.useEffect(() => {
    if (ticket) setPriorityDraft(ticket.priority);
  }, [ticket]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ti-ticket-detail', ticketId] });
    queryClient.invalidateQueries({ queryKey: ['ti-tickets-queue'] });
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

  const assignMutation = useAction(() => tiApi.assignTicket(ticketId!), 'Não foi possível assumir o chamado');
  const waitMutation = useAction(() => tiApi.waitTicket(ticketId!), 'Não foi possível colocar o chamado em espera');
  const resumeMutation = useAction(() => tiApi.resumeTicket(ticketId!), 'Não foi possível retomar o chamado');
  const cancelMutation = useAction(() => tiApi.cancelTicket(ticketId!), 'Não foi possível cancelar o chamado');
  const linkMaintenanceMutation = useAction(
    () => tiApi.linkMaintenanceOrder(ticketId!),
    'Não foi possível vincular a ordem de manutenção',
  );
  const resolveMutation = useAction(() => tiApi.resolveTicket(ticketId!, solutionText), 'Não foi possível resolver o chamado');
  const commentMutation = useAction(
    () => tiApi.addTicketComment(ticketId!, commentText, isInternalComment),
    'Não foi possível adicionar o comentário',
  );
  const priorityMutation = useAction(
    () => tiApi.changeTicketPriority(ticketId!, { priority: priorityDraft, reason: priorityReason }),
    'Não foi possível reclassificar a prioridade',
  );

  React.useEffect(() => {
    if (ticketId != null) {
      setActionError(null);
      setCommentText('');
      setSolutionText('');
      setPriorityReason('');
    }
  }, [ticketId]);

  return (
    <Dialog open={ticketId != null} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{ticket ? `${ticket.ticket_number} — ${ticket.subject}` : 'Chamado'}</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {ticket && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <TicketStatusBadge status={ticket.status} />
              <TicketPriorityBadge priority={ticket.priority} />
              <span className="text-xs text-muted-foreground">Solicitante: {ticket.requester?.name ?? '-'}</span>
              <span className="text-xs text-muted-foreground">Responsável: {ticket.assigned_to?.name ?? '-'}</span>
            </div>
            <p className="text-sm">{ticket.description}</p>

            {actionError && <DidacticAlert error={actionError} />}

            <div className="flex flex-wrap gap-2">
              {ticket.status === 'open' && (
                <Button type="button" size="sm" disabled={assignMutation.isPending} onClick={() => assignMutation.mutate(undefined)}>
                  Assumir chamado
                </Button>
              )}
              {ticket.status === 'in_progress' && (
                <Button type="button" size="sm" variant="outline" disabled={waitMutation.isPending} onClick={() => waitMutation.mutate(undefined)}>
                  Colocar em espera
                </Button>
              )}
              {ticket.status === 'waiting' && (
                <Button type="button" size="sm" variant="outline" disabled={resumeMutation.isPending} onClick={() => resumeMutation.mutate(undefined)}>
                  Retomar atendimento
                </Button>
              )}
              {(ticket.status === 'in_progress' || ticket.status === 'waiting') && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={linkMaintenanceMutation.isPending}
                  onClick={() => linkMaintenanceMutation.mutate(undefined)}
                  title="Gera ordem de manutenção e move o chamado para 'aguardando'"
                >
                  <Wrench className="size-4" />
                  Vincular O.M.
                </Button>
              )}
              {ticket.status === 'open' && (
                <Button type="button" size="sm" variant="destructive" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate(undefined)}>
                  Cancelar
                </Button>
              )}
            </div>

            {(ticket.status === 'in_progress' || ticket.status === 'waiting') && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-semibold">Registrar solução (obrigatório para resolver)</p>
                <Textarea rows={2} value={solutionText} onChange={(event) => setSolutionText(event.target.value)} />
                <Button
                  type="button"
                  size="sm"
                  disabled={!solutionText.trim() || resolveMutation.isPending}
                  onClick={() => resolveMutation.mutate(undefined)}
                  className="self-start"
                >
                  Resolver chamado
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-2 rounded-md border p-3">
              <p className="text-sm font-semibold">Reclassificar prioridade</p>
              <div className="grid grid-cols-2 gap-2">
                <SelectNative value={priorityDraft} onChange={(event) => setPriorityDraft(event.target.value as tiApi.TicketPriority)}>
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </SelectNative>
                <input
                  className="rounded-md border border-input px-3 py-1.5 text-sm"
                  placeholder="Motivo da mudança"
                  value={priorityReason}
                  onChange={(event) => setPriorityReason(event.target.value)}
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="self-start"
                disabled={!priorityReason.trim() || priorityMutation.isPending}
                onClick={() => priorityMutation.mutate(undefined)}
              >
                Salvar prioridade
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">Comentários</p>
              <div className="flex max-h-48 flex-col gap-2 overflow-y-auto rounded-md border p-2">
                {ticket.comments.length === 0 && <p className="text-xs text-muted-foreground">Nenhum comentário ainda.</p>}
                {ticket.comments.map((comment) => (
                  <div key={comment.id} className="rounded-md bg-muted/40 p-2 text-sm">
                    <p className="text-xs font-medium text-muted-foreground">
                      {comment.author?.name ?? 'Sistema'} · {formatDateTime(comment.created_at)}
                      {comment.is_internal && ' · nota interna'}
                    </p>
                    <p>{comment.body}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <Textarea rows={2} placeholder="Adicionar comentário..." value={commentText} onChange={(event) => setCommentText(event.target.value)} />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input type="checkbox" checked={isInternalComment} onChange={(event) => setIsInternalComment(event.target.checked)} />
                    Nota interna (não visível ao solicitante)
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!commentText.trim() || commentMutation.isPending}
                    onClick={() => commentMutation.mutate(undefined)}
                  >
                    <MessageSquare className="size-4" />
                    Comentar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
