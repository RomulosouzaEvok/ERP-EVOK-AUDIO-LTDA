import { Badge } from '@/components/ui/badge';
import type { AccessRequestStatus, AccessRequestType, TermStatus, TicketPriority, TicketStatus } from '@/api/ti';

/** Formata uma data ISO (`YYYY-MM-DD` ou timestamp) para `dd/mm/aaaa` (pt-BR). Retorna "-" se ausente/vazia. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

/** Formata um timestamp ISO completo (data + hora) para `dd/mm/aaaa hh:mm` (pt-BR). */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Converte um valor `Date`/string em `YYYY-MM-DD` para uso em `<input type="date">`/payload da API. */
export function toDateInputValue(value: string | Date = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

/** Converte um `Date` para `YYYY-MM-DDTHH:mm` (uso em `<input type="datetime-local">`). */
export function toDateTimeInputValue(value: string | Date = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString().slice(0, 16);
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em atendimento',
  waiting: 'Aguardando',
  resolved: 'Resolvido',
  closed: 'Fechado',
  canceled: 'Cancelado',
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  switch (status) {
    case 'open':
      return <Badge variant="secondary">Aberto</Badge>;
    case 'in_progress':
      return <Badge variant="warning">Em atendimento</Badge>;
    case 'waiting':
      return <Badge variant="outline">Aguardando</Badge>;
    case 'resolved':
      return <Badge variant="success">Resolvido</Badge>;
    case 'closed':
      return <Badge variant="success">Fechado</Badge>;
    case 'canceled':
      return <Badge variant="destructive">Cancelado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  switch (priority) {
    case 'low':
      return <Badge variant="secondary">Baixa</Badge>;
    case 'medium':
      return <Badge variant="outline">Média</Badge>;
    case 'high':
      return <Badge variant="warning">Alta</Badge>;
    case 'urgent':
      return <Badge variant="destructive">Urgente</Badge>;
    default:
      return <Badge variant="outline">{priority}</Badge>;
  }
}

export const TERM_STATUS_LABELS: Record<TermStatus, string> = {
  active: 'Ativo',
  returned: 'Devolvido',
  lost: 'Perdido',
};

export function TermStatusBadge({ status }: { status: TermStatus }) {
  if (status === 'active') return <Badge variant="warning">Ativo</Badge>;
  if (status === 'returned') return <Badge variant="success">Devolvido</Badge>;
  if (status === 'lost') return <Badge variant="destructive">Perdido</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export const ACCESS_REQUEST_TYPE_LABELS: Record<AccessRequestType, string> = {
  grant: 'Admissão (grant)',
  change: 'Mudança de função (change)',
  revoke: 'Desligamento (revoke)',
};

export const ACCESS_REQUEST_STATUS_LABELS: Record<AccessRequestStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  done: 'Concluída',
  rejected: 'Rejeitada',
  canceled: 'Cancelada',
};

export function AccessRequestStatusBadge({ status }: { status: AccessRequestStatus }) {
  switch (status) {
    case 'pending':
      return <Badge variant="warning">Pendente</Badge>;
    case 'approved':
      return <Badge variant="outline">Aprovada</Badge>;
    case 'done':
      return <Badge variant="success">Concluída</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Rejeitada</Badge>;
    case 'canceled':
      return <Badge variant="secondary">Cancelada</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

/** Referência genérica de pessoa retornada por vários endpoints do TI (pode vir como objeto {id,name} ou id cru). */
export function refName(ref: { id: number; name?: string } | number | null | undefined): string {
  if (ref == null) return '-';
  if (typeof ref === 'number') return `#${ref}`;
  return ref.name ?? `#${ref.id}`;
}
