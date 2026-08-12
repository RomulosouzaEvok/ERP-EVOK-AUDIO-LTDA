import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Info, Plus, Trash2 } from 'lucide-react';

import * as directorateApi from '@/api/directorate';
import { useAuth } from '@/context/AuthContext';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';
import { DidacticAlert } from '@/components/DidacticAlert';

const TYPE_LABEL: Record<directorateApi.MeetingType, string> = {
  directors: 'Diretoria',
  commercial: 'Comercial',
  industrial: 'Industrial',
  financial: 'Financeira',
  board: 'Conselho',
  general: 'Geral',
};

interface ActionItemDraft {
  description: string;
  responsible: string;
  due_date: string;
}

/**
 * Aba "Atas de Reunião" de `/directorate` — `/api/directorate/meeting-minutes`.
 * Ata é registro de governança IMUTÁVEL após criação: não há `update`/
 * `delete`, nem aqui nem no backend. Se a ata está errada, registra-se uma
 * nova ata retificadora — o aviso aparece no diálogo de criação.
 */
export function MeetingMinutesTab() {
  const { hasRole, permissions } = useAuth();
  const canWrite = hasRole('admin') || permissions?.diretoria === 'approve';

  const [typeFilter, setTypeFilter] = React.useState<directorateApi.MeetingType | ''>('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [page, setPage] = React.useState(1);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['directorate-meeting-minutes', typeFilter, from, to, page],
    queryFn: () =>
      directorateApi.listMeetingMinutes({
        meeting_type: typeFilter || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        limit: 20,
      }),
  });

  const colSpan = 5;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mm-type-filter">Tipo</Label>
            <SelectNative
              id="mm-type-filter"
              className="w-44"
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value as directorateApi.MeetingType | '');
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {Object.entries(TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mm-from-filter">De</Label>
            <Input
              id="mm-from-filter"
              type="date"
              className="w-40"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mm-to-filter">Até</Label>
            <Input
              id="mm-to-filter"
              type="date"
              className="w-40"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus /> Nova ata
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Itens de ação</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={colSpan} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-destructive">
                Não foi possível carregar as atas. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((minute) => (
            <TableRow key={minute.id}>
              <TableCell>{formatDate(minute.meeting_date)}</TableCell>
              <TableCell>
                <Badge variant="outline">{TYPE_LABEL[minute.meeting_type]}</Badge>
              </TableCell>
              <TableCell className="max-w-72 font-medium">{minute.title}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{Array.isArray(minute.action_items) ? minute.action_items.length : 0}</TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => setDetailId(minute.id)}>
                  <Eye className="size-4" /> Ver
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
                Nenhuma ata registrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <CreateMinuteDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <MinuteDetailDialog id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function CreateMinuteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [meetingDate, setMeetingDate] = React.useState('');
  const [meetingType, setMeetingType] = React.useState<directorateApi.MeetingType>('directors');
  const [title, setTitle] = React.useState('');
  const [participants, setParticipants] = React.useState('');
  const [summary, setSummary] = React.useState('');
  const [decisions, setDecisions] = React.useState<string[]>([]);
  const [decisionDraft, setDecisionDraft] = React.useState('');
  const [actionItems, setActionItems] = React.useState<ActionItemDraft[]>([]);
  const [actionDraft, setActionDraft] = React.useState<ActionItemDraft>({ description: '', responsible: '', due_date: '' });
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setMeetingDate('');
      setMeetingType('directors');
      setTitle('');
      setParticipants('');
      setSummary('');
      setDecisions([]);
      setDecisionDraft('');
      setActionItems([]);
      setActionDraft({ description: '', responsible: '', due_date: '' });
      setError(null);
      setValidationError(null);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () =>
      directorateApi.createMeetingMinute({
        meeting_date: meetingDate,
        meeting_type: meetingType,
        title: title.trim(),
        participants: participants.trim() || undefined,
        summary: summary.trim() || undefined,
        decisions,
        action_items: actionItems,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directorate-meeting-minutes'] });
      onClose();
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível registrar a ata')),
  });

  const addDecision = () => {
    if (!decisionDraft.trim()) return;
    setDecisions((prev) => [...prev, decisionDraft.trim()]);
    setDecisionDraft('');
  };

  const addActionItem = () => {
    if (!actionDraft.description.trim()) return;
    setActionItems((prev) => [...prev, actionDraft]);
    setActionDraft({ description: '', responsible: '', due_date: '' });
  };

  const handleConfirm = () => {
    if (!meetingDate || !title.trim()) {
      setValidationError('Informe a data e o título da reunião.');
      return;
    }
    setValidationError(null);
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova ata de reunião</DialogTitle>
          <DialogDescription>Data, tipo, título, participantes, resumo, decisões e itens de ação.</DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-md border border-amber-700/40 bg-amber-700/10 p-2.5 text-xs text-amber-900">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>A ata não pode ser alterada depois de registrada. Se houver erro, registre uma nova ata retificadora.</span>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mm-form-date">Data da reunião *</Label>
              <Input id="mm-form-date" type="date" value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mm-form-type">Tipo *</Label>
              <SelectNative id="mm-form-type" value={meetingType} onChange={(event) => setMeetingType(event.target.value as directorateApi.MeetingType)}>
                {Object.entries(TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mm-form-title">Título *</Label>
            <Input id="mm-form-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mm-form-participants">Participantes</Label>
            <textarea
              id="mm-form-participants"
              className="flex min-h-14 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={participants}
              onChange={(event) => setParticipants(event.target.value)}
              placeholder="Nomes separados por vírgula"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mm-form-summary">Resumo</Label>
            <textarea
              id="mm-form-summary"
              className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Decisões</Label>
            <div className="flex gap-2">
              <Input
                value={decisionDraft}
                onChange={(event) => setDecisionDraft(event.target.value)}
                placeholder="Descreva uma decisão e adicione"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addDecision();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addDecision}>
                <Plus className="size-4" />
              </Button>
            </div>
            {decisions.length > 0 && (
              <ul className="flex flex-col gap-1">
                {decisions.map((decision, index) => (
                  <li key={index} className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm">
                    <span>{decision}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setDecisions((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Itens de ação</Label>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2">
              <Input
                value={actionDraft.description}
                onChange={(event) => setActionDraft((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Descrição"
              />
              <Input
                className="w-32"
                value={actionDraft.responsible}
                onChange={(event) => setActionDraft((prev) => ({ ...prev, responsible: event.target.value }))}
                placeholder="Responsável"
              />
              <Input
                className="w-36"
                type="date"
                value={actionDraft.due_date}
                onChange={(event) => setActionDraft((prev) => ({ ...prev, due_date: event.target.value }))}
              />
              <Button type="button" variant="outline" onClick={addActionItem}>
                <Plus className="size-4" />
              </Button>
            </div>
            {actionItems.length > 0 && (
              <ul className="flex flex-col gap-1">
                {actionItems.map((item, index) => (
                  <li key={index} className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm">
                    <span>
                      {item.description}
                      {item.responsible ? ` — ${item.responsible}` : ''}
                      {item.due_date ? ` (${formatDate(item.due_date)})` : ''}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setActionItems((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {validationError && <p className="text-sm text-destructive">{validationError}</p>}
        </div>
        {error && <DidacticAlert error={error} />}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={mutation.isPending}>
            {mutation.isPending ? 'Registrando...' : 'Registrar ata'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MinuteDetailDialog({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['directorate-meeting-minute', id],
    queryFn: () => directorateApi.getMeetingMinute(id!),
    enabled: id !== null,
  });

  return (
    <Dialog open={id !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{data?.title ?? 'Ata de reunião'}</DialogTitle>
          <DialogDescription>
            {data ? `${formatDate(data.meeting_date)} — ${TYPE_LABEL[data.meeting_type]}` : 'Carregando...'}
          </DialogDescription>
        </DialogHeader>
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {data && (
          <div className="flex flex-col gap-4 text-sm">
            <div>
              <p className="mb-1 font-semibold">Participantes</p>
              <p className="text-muted-foreground">{data.participants || '—'}</p>
            </div>
            <div>
              <p className="mb-1 font-semibold">Resumo</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{data.summary || '—'}</p>
            </div>
            <div>
              <p className="mb-1 font-semibold">Decisões</p>
              {Array.isArray(data.decisions) && data.decisions.length > 0 ? (
                <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">
                  {data.decisions.map((decision, index) => (
                    <li key={index}>{typeof decision === 'string' ? decision : JSON.stringify(decision)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Nenhuma decisão registrada.</p>
              )}
            </div>
            <div>
              <p className="mb-1 font-semibold">Itens de ação</p>
              {Array.isArray(data.action_items) && data.action_items.length > 0 ? (
                <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">
                  {data.action_items.map((item, index) => (
                    <li key={index}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Nenhum item de ação registrado.</p>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
