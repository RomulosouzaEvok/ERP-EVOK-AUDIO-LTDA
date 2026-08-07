import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarDays, CheckCircle2, Plus } from 'lucide-react';

import * as marketingApi from '@/api/marketing';
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
import { CHECKLIST_STATUS_LABELS, EVENT_TYPE_LABELS, EventStatusBadge, LeadStatusBadge, formatCurrency } from './marketingShared';

/** Aba "Eventos/Feiras" de `/marketing` — CRUD, checklist, leads vinculados e encerramento com custo real (UC-65). */
export function EventsTab() {
  const { hasRole, permissions } = useAuth();
  const canWrite = hasRole('admin') || permissions?.marketing === 'operate' || permissions?.marketing === 'approve';
  const [statusFilter, setStatusFilter] = React.useState<marketingApi.EventStatus | ''>('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['marketing-events', statusFilter],
    queryFn: () => marketingApi.listEvents({ status: statusFilter || undefined, limit: 100 }),
  });

  const colCount = 6;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-status-filter" className="text-sm text-muted-foreground">
            Status
          </Label>
          <SelectNative
            id="event-status-filter"
            className="max-w-48"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as marketingApi.EventStatus | '')}
          >
            <option value="">Todos</option>
            <option value="planned">Planejado</option>
            <option value="in_progress">Em andamento</option>
            <option value="completed">Concluído</option>
            <option value="canceled">Cancelado</option>
          </SelectNative>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Novo evento
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Período</TableHead>
            <TableHead>Orçamento / Custo real</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={colCount} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={colCount} className="text-center text-destructive">
                Não foi possível carregar os eventos. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="font-medium">{event.name}</TableCell>
              <TableCell>{EVENT_TYPE_LABELS[event.event_type]}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {event.start_date}
                {event.end_date ? ` – ${event.end_date}` : ''}
              </TableCell>
              <TableCell className="tabular-nums text-xs">
                {formatCurrency(event.budget)} / {formatCurrency(event.actual_cost)}
              </TableCell>
              <TableCell>
                <EventStatusBadge status={event.status} />
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => setDetailId(event.id)}>
                  Detalhes
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={colCount} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <CalendarDays className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum evento cadastrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <CreateEventDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => setDetailId(id)} />
      <EventDetailDialog eventId={detailId} onClose={() => setDetailId(null)} canWrite={canWrite} />
    </div>
  );
}

const createEventSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.').max(200),
  location: z.string().trim().max(255).optional(),
  event_type: z.enum(['feira', 'lancamento', 'workshop', 'regional']),
  campaign_id: z.coerce.number().int().positive().optional().or(z.literal('').transform(() => undefined)),
  start_date: z.string().trim().min(1, 'Informe a data de início.'),
  end_date: z.string().trim().optional(),
  budget: z.coerce.number().min(0).optional().or(z.literal('').transform(() => undefined)),
});

type CreateEventFormData = z.infer<typeof createEventSchema>;

function CreateEventDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const { data: campaigns } = useQuery({
    queryKey: ['marketing-campaigns-select'],
    queryFn: () => marketingApi.listCampaigns({ limit: 100 }),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateEventFormData>({
    resolver: zodResolver(createEventSchema),
    defaultValues: { name: '', event_type: 'feira', start_date: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateEventFormData) => marketingApi.createEvent(values as marketingApi.CreateEventInput),
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-events'] });
      setFormError(null);
      onCreated(event.id);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível cadastrar o evento')),
  });

  React.useEffect(() => {
    if (open) {
      reset({ name: '', event_type: 'feira', start_date: '' });
      setFormError(null);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo evento/feira</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-name">Nome *</Label>
            <Input id="event-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-type">Tipo *</Label>
              <SelectNative id="event-type" {...register('event_type')}>
                {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-location">Local</Label>
              <Input id="event-location" {...register('location')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-start">Início *</Label>
              <Input id="event-start" type="date" {...register('start_date')} />
              {errors.start_date && <p className="text-sm text-destructive">{errors.start_date.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-end">Fim</Label>
              <Input id="event-end" type="date" {...register('end_date')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-campaign">Campanha (opcional)</Label>
              <SelectNative id="event-campaign" {...register('campaign_id')}>
                <option value="">-</option>
                {(campaigns?.data ?? []).map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-budget">Orçamento (R$)</Label>
              <Input id="event-budget" type="number" step="0.01" {...register('budget')} />
            </div>
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Criar evento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EventDetailDialog({ eventId, onClose, canWrite }: { eventId: number | null; onClose: () => void; canWrite: boolean }) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [checklistDesc, setChecklistDesc] = React.useState('');
  const [closeCost, setCloseCost] = React.useState('');

  const { data: event, isLoading } = useQuery({
    queryKey: ['marketing-event-detail', eventId],
    queryFn: () => marketingApi.getEvent(eventId!),
    enabled: eventId != null,
  });

  const { data: leads } = useQuery({
    queryKey: ['marketing-event-leads', eventId],
    queryFn: () => marketingApi.getEventLeads(eventId!),
    enabled: eventId != null,
  });

  React.useEffect(() => {
    if (eventId != null) {
      setError(null);
      setChecklistDesc('');
      setCloseCost('');
    }
  }, [eventId]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['marketing-event-detail', eventId] });
    queryClient.invalidateQueries({ queryKey: ['marketing-events'] });
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

  const addChecklistMutation = useAction(
    () => marketingApi.addEventChecklistItem(eventId!, { description: checklistDesc }),
    'Não foi possível adicionar o item de checklist',
  );
  const toggleChecklistMutation = useAction(
    (item: marketingApi.EventChecklistItem) =>
      marketingApi.updateEventChecklistItem(eventId!, item.id, { status: item.status === 'done' ? 'pending' : 'done' }),
    'Não foi possível atualizar o item de checklist',
  );
  const closeMutation = useAction(
    () => marketingApi.closeEvent(eventId!, closeCost ? Number(closeCost) : undefined),
    'Não foi possível encerrar o evento',
  );

  return (
    <Dialog open={eventId != null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{event ? event.name : 'Evento'}</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {event && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <EventStatusBadge status={event.status} />
              <span className="text-xs text-muted-foreground">Leads captados: {event.leads_count}</span>
              <span className="text-xs text-muted-foreground">Custo por lead: {formatCurrency(event.cost_per_lead)}</span>
              <span className="text-xs text-muted-foreground">Orçamento: {formatCurrency(event.budget)}</span>
              <span className="text-xs text-muted-foreground">Custo real: {formatCurrency(event.actual_cost)}</span>
            </div>

            {error && <DidacticAlert error={error} />}

            <div className="flex flex-col gap-2 rounded-md border p-3">
              <p className="text-sm font-semibold">Checklist ({event.checklist.length})</p>
              <ul className="flex max-h-32 flex-col gap-1 overflow-y-auto text-xs">
                {event.checklist.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2">
                    <span className={item.status === 'done' ? 'text-muted-foreground line-through' : ''}>{item.description}</span>
                    {canWrite && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 gap-1 text-xs"
                        disabled={toggleChecklistMutation.isPending}
                        onClick={() => toggleChecklistMutation.mutate(item)}
                      >
                        {item.status === 'done' ? <CheckCircle2 className="size-3 text-success" /> : CHECKLIST_STATUS_LABELS.pending}
                      </Button>
                    )}
                  </li>
                ))}
                {event.checklist.length === 0 && <li className="text-muted-foreground">Nenhum item.</li>}
              </ul>
              {canWrite && event.status !== 'completed' && event.status !== 'canceled' && (
                <div className="flex gap-2">
                  <Input placeholder="Novo item de checklist" value={checklistDesc} onChange={(e) => setChecklistDesc(e.target.value)} />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!checklistDesc.trim() || addChecklistMutation.isPending}
                    onClick={() => addChecklistMutation.mutate(undefined)}
                  >
                    Adicionar
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 rounded-md border p-3">
              <p className="text-sm font-semibold">Leads captados ({leads?.data.length ?? 0})</p>
              <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto text-xs">
                {(leads?.data ?? []).map((lead) => (
                  <li key={lead.id} className="flex items-center justify-between gap-2">
                    <span>{lead.name}</span>
                    <LeadStatusBadge status={lead.status} />
                  </li>
                ))}
                {(leads?.data ?? []).length === 0 && <li className="text-muted-foreground">Nenhum lead vinculado.</li>}
              </ul>
            </div>

            {canWrite && event.status !== 'completed' && event.status !== 'canceled' && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-semibold">Encerrar evento (exige custo real, RF-MKT-025)</p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Custo real (R$)"
                    value={closeCost}
                    onChange={(e) => setCloseCost(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={(!closeCost && !event.actual_cost) || closeMutation.isPending}
                    onClick={() => closeMutation.mutate(undefined)}
                  >
                    Encerrar
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
