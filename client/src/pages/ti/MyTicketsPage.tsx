import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarClock, LifeBuoy, MessageSquare, Plus, RotateCcw, Star, Tag } from 'lucide-react';

import * as tiApi from '@/api/ti';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/Textarea';
import { SelectNative } from '@/components/ui/select-native';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  formatDateTime,
  TICKET_STATUS_LABELS,
  TicketPriorityBadge,
  TicketStatusBadge,
} from './tiShared';

/**
 * `/meus-chamados` — Auto-serviço de Helpdesk de TI (BR-TI-001/RNF-TI-02,
 * UC-49). Acessível a **qualquer usuário autenticado**, independentemente de
 * possuir o módulo `ti` — não fica atrás de `ModuleRoute`. Cobre apenas os
 * chamados do próprio usuário: abrir, acompanhar, comentar, confirmar
 * resolução e reabrir. A fila completa de gestão fica em `/ti` (TiPage).
 */
export default function MyTicketsPage() {
  const [statusFilter, setStatusFilter] = React.useState<tiApi.TicketStatus | ''>('');
  const [newTicketOpen, setNewTicketOpen] = React.useState(false);
  const [detailTicketId, setDetailTicketId] = React.useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ti-my-tickets', statusFilter],
    queryFn: () => tiApi.listMyTickets({ status: statusFilter || undefined, limit: 50 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <LifeBuoy className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Meus Chamados</h1>
          <p className="text-sm text-muted-foreground">Abra e acompanhe seus chamados de TI — suporte, hardware, software, acesso.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="my-tickets-status" className="text-sm text-muted-foreground">
            Status
          </Label>
          <SelectNative
            id="my-tickets-status"
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
          size="lg"
          className="w-full gap-2 shadow-sm sm:w-auto"
          onClick={() => setNewTicketOpen(true)}
        >
          <Plus className="size-5" />
          Abrir chamado
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-36 rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
          Não foi possível carregar seus chamados. Tente novamente.
        </div>
      )}

      {!isLoading && !isError && data?.data.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center">
          <LifeBuoy className="size-10 text-muted-foreground/40" />
          <p className="text-base font-medium">Você ainda não abriu nenhum chamado.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Precisa de ajuda com computador, sistema ou acesso? Clique em &quot;Abrir chamado&quot; acima.
          </p>
        </div>
      )}

      {!isLoading && !isError && (data?.data.length ?? 0) > 0 && (
        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data!.data.map((ticket) => (
            <Card
              key={ticket.id}
              className="flex flex-col border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:shadow-md"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{ticket.subject}</CardTitle>
                  <TicketStatusBadge status={ticket.status} />
                </div>
                <CardDescription className="font-mono text-xs">{ticket.ticket_number}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-3 pt-0">
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Tag className="size-3.5 shrink-0" />
                    {ticket.category?.name ?? 'Sem categoria'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="size-3.5 shrink-0" />
                    Aberto em {formatDateTime(ticket.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <TicketPriorityBadge priority={ticket.priority} />
                  <Button size="sm" variant="outline" onClick={() => setDetailTicketId(ticket.id)}>
                    Ver detalhe
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NewTicketDialog open={newTicketOpen} onClose={() => setNewTicketOpen(false)} />
      <TicketDetailDialog ticketId={detailTicketId} onClose={() => setDetailTicketId(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Abertura de chamado
// ---------------------------------------------------------------------------

const newTicketSchema = z.object({
  subject: z.string().min(1, 'Informe o assunto.'),
  description: z.string().min(1, 'Descreva o problema.'),
  category_id: z.coerce.number().int().positive('Selecione a categoria.'),
  asset_id: z.union([z.coerce.number().int().positive(), z.literal('')]).optional(),
  urgency_perceived: z.enum(['low', 'medium', 'high', 'urgent']),
});

type NewTicketFormData = z.infer<typeof newTicketSchema>;

function NewTicketDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['ti-active-categories'],
    queryFn: tiApi.listActiveTicketCategories,
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewTicketFormData>({ resolver: zodResolver(newTicketSchema), defaultValues: { urgency_perceived: 'medium' } });

  const mutation = useMutation({
    mutationFn: (values: NewTicketFormData) =>
      tiApi.createTicket({
        subject: values.subject,
        description: values.description,
        category_id: values.category_id,
        asset_id: values.asset_id ? Number(values.asset_id) : null,
        urgency_perceived: values.urgency_perceived,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ti-my-tickets'] });
      reset({ urgency_perceived: 'medium' } as never);
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível abrir o chamado')),
  });

  React.useEffect(() => {
    if (open) {
      reset({ urgency_perceived: 'medium' } as never);
      setFormError(null);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir chamado de TI</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-subject">Assunto</Label>
            <Input id="ticket-subject" placeholder="Ex.: Impressora não imprime" {...register('subject')} />
            {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-description">Descrição</Label>
            <Textarea id="ticket-description" rows={4} placeholder="Descreva o problema com detalhes" {...register('description')} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ticket-category">Categoria</Label>
              <SelectNative id="ticket-category" {...register('category_id')}>
                <option value="">Selecione...</option>
                {(categories ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </SelectNative>
              {errors.category_id && <p className="text-sm text-destructive">{errors.category_id.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ticket-urgency">Urgência percebida</Label>
              <SelectNative id="ticket-urgency" {...register('urgency_perceived')}>
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </SelectNative>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-asset">Ativo relacionado (opcional — ID do patrimônio)</Label>
            <Input id="ticket-asset" type="number" placeholder="Ex.: 118" {...register('asset_id')} />
          </div>
          {formError && <DidacticAlert error={formError} />}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Enviando...' : 'Abrir chamado'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Detalhe do chamado (auto-serviço): comentar, confirmar, reabrir
// ---------------------------------------------------------------------------

function TicketDetailDialog({ ticketId, onClose }: { ticketId: number | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = React.useState('');
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);
  const [satisfaction, setSatisfaction] = React.useState<number>(5);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ti-ticket-detail', ticketId],
    queryFn: () => tiApi.getTicket(ticketId!),
    enabled: ticketId != null,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ti-ticket-detail', ticketId] });
    queryClient.invalidateQueries({ queryKey: ['ti-my-tickets'] });
  };

  const commentMutation = useMutation({
    mutationFn: () => tiApi.addTicketComment(ticketId!, commentText),
    onSuccess: () => {
      setCommentText('');
      setActionError(null);
      invalidate();
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível adicionar o comentário')),
  });

  const confirmMutation = useMutation({
    mutationFn: () => tiApi.confirmTicket(ticketId!, { satisfaction_rating: satisfaction }),
    onSuccess: () => {
      setActionError(null);
      invalidate();
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível confirmar a resolução do chamado')),
  });

  const reopenMutation = useMutation({
    mutationFn: () => tiApi.reopenTicket(ticketId!),
    onSuccess: () => {
      setActionError(null);
      invalidate();
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível reabrir o chamado')),
  });

  React.useEffect(() => {
    if (ticketId != null) {
      setCommentText('');
      setActionError(null);
      setSatisfaction(5);
    }
  }, [ticketId]);

  return (
    <Dialog open={ticketId != null} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{ticket ? `${ticket.ticket_number} — ${ticket.subject}` : 'Chamado'}</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {ticket && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <TicketStatusBadge status={ticket.status} />
              <TicketPriorityBadge priority={ticket.priority} />
              {ticket.category?.name && <span className="text-xs text-muted-foreground">{ticket.category.name}</span>}
            </div>

            <p className="text-sm text-foreground">{ticket.description}</p>

            {ticket.solution && (
              <div className="rounded-md border border-success/30 bg-success/10 p-3 text-sm">
                <p className="font-semibold text-success">Solução registrada pela TI</p>
                <p className="text-foreground/90">{ticket.solution}</p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">Comentários</p>
              <div className="flex max-h-48 flex-col gap-2 overflow-y-auto rounded-md border p-2">
                {ticket.comments.length === 0 && <p className="text-xs text-muted-foreground">Nenhum comentário ainda.</p>}
                {ticket.comments.map((comment) => (
                  <div key={comment.id} className="rounded-md bg-muted/40 p-2 text-sm">
                    <p className="text-xs font-medium text-muted-foreground">
                      {comment.author?.name ?? 'Você'} · {formatDateTime(comment.created_at)}
                    </p>
                    <p>{comment.body}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Textarea
                  rows={2}
                  placeholder="Adicionar comentário..."
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!commentText.trim() || commentMutation.isPending}
                  onClick={() => commentMutation.mutate()}
                >
                  <MessageSquare className="size-4" />
                </Button>
              </div>
            </div>

            {actionError && <DidacticAlert error={actionError} />}

            {ticket.status === 'resolved' && (
              <div className="flex flex-col gap-2 rounded-md border border-brand/30 bg-brand/5 p-3">
                <p className="text-sm font-medium">O problema foi resolvido? Avalie e confirme para fechar o chamado.</p>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSatisfaction(value)}
                        aria-label={`${value} estrela(s)`}
                        className="rounded-sm p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
                      >
                        <Star className={`size-5 ${value <= satisfaction ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                      </button>
                    ))}
                  </div>
                  <Button type="button" size="sm" disabled={confirmMutation.isPending} onClick={() => confirmMutation.mutate()}>
                    {confirmMutation.isPending ? 'Confirmando...' : 'Confirmar resolução'}
                  </Button>
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {(ticket.status === 'resolved' || ticket.status === 'closed') && (
                <Button type="button" size="sm" variant="outline" disabled={reopenMutation.isPending} onClick={() => reopenMutation.mutate()}>
                  <RotateCcw className="size-4" />
                  Reabrir chamado
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
