import { Badge } from '@/components/ui/badge';
import type {
  AssetStatus,
  FineIndicationStatus,
  FineStatus,
  MaintenanceTicketPriority,
  MaintenanceTicketStatus,
  TripStatus,
  VehicleDocStatus,
  VisitStatus,
} from '@/api/facilities';

// Formatação canônica em `@/lib/format` (re-export preserva os consumidores).
export { formatDate, formatDateTime, toDateInputValue, toDateTimeInputValue, formatCurrency } from '@/lib/format';

/** Dias restantes até uma data (negativo = vencido). */
export function daysUntil(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** Semáforo genérico por dias restantes (usado para CNH, documentos de veículo, prazo de indicação de multa). */
export function DeadlineBadge({ dueDate, doneLabel }: { dueDate: string | null; doneLabel?: string }) {
  if (!dueDate) return <Badge variant="outline">Sem vencimento</Badge>;
  const remaining = daysUntil(dueDate);
  if (doneLabel) return <Badge variant="success">{doneLabel}</Badge>;
  if (remaining < 0) return <Badge variant="destructive">Vencido ({Math.abs(remaining)}d)</Badge>;
  if (remaining <= 7) return <Badge variant="destructive">{remaining}d — crítico</Badge>;
  if (remaining <= 30) return <Badge variant="warning">{remaining}d — atenção</Badge>;
  return <Badge variant="outline">{remaining}d</Badge>;
}

// ---------------------------------------------------------------------------
// Frota
// ---------------------------------------------------------------------------

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  active: 'Ativo',
  in_maintenance: 'Em manutenção',
  decommissioned: 'Baixado',
  lost: 'Perdido',
  returned_to_supplier: 'Devolvido ao fornecedor',
};

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  switch (status) {
    case 'active':
      return <Badge variant="success">Ativo</Badge>;
    case 'in_maintenance':
      return <Badge variant="warning">Em manutenção</Badge>;
    default:
      return <Badge variant="destructive">{ASSET_STATUS_LABELS[status]}</Badge>;
  }
}

export const VEHICLE_DOC_TYPE_LABELS: Record<string, string> = {
  crlv_licenciamento: 'CRLV/Licenciamento',
  seguro: 'Seguro',
  ipva: 'IPVA',
  outro: 'Outro',
};

export function VehicleDocStatusBadge({ status }: { status: VehicleDocStatus }) {
  if (status === 'vigente') return <Badge variant="success">Vigente</Badge>;
  if (status === 'renovado') return <Badge variant="secondary">Renovado</Badge>;
  return <Badge variant="destructive">Vencido</Badge>;
}

export const TRIP_PURPOSE_LABELS: Record<string, string> = {
  delivery: 'Entrega',
  executive: 'Executivo',
  errand: 'Corrida/serviço',
  other: 'Outro',
};

export function TripStatusBadge({ status }: { status: TripStatus }) {
  switch (status) {
    case 'scheduled':
      return <Badge variant="outline">Agendado</Badge>;
    case 'out':
      return <Badge variant="warning">Em uso</Badge>;
    case 'returned':
      return <Badge variant="success">Retornado</Badge>;
    case 'canceled':
      return <Badge variant="destructive">Cancelado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function FineStatusBadge({ status }: { status: FineStatus }) {
  switch (status) {
    case 'open':
      return <Badge variant="warning">Aberta</Badge>;
    case 'paid':
      return <Badge variant="success">Paga</Badge>;
    case 'appealed':
      return <Badge variant="secondary">Recorrida</Badge>;
    case 'canceled':
      return <Badge variant="outline">Cancelada</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export const FINE_INDICATION_STATUS_LABELS: Record<FineIndicationStatus, string> = {
  pending: 'Pendente',
  indicated: 'Indicada',
  expired_nic: 'Prazo vencido (NIC)',
  not_applicable: 'Não aplicável',
};

export function FineIndicationBadge({ status, deadline }: { status: FineIndicationStatus; deadline: string | null }) {
  if (status === 'indicated') return <Badge variant="success">Indicada</Badge>;
  if (status === 'expired_nic') return <Badge variant="destructive">Prazo vencido (NIC)</Badge>;
  if (status === 'not_applicable') return <Badge variant="outline">Não aplicável</Badge>;
  // pending: aplica o mesmo semáforo de prazo do deadline
  return <DeadlineBadge dueDate={deadline} />;
}

// ---------------------------------------------------------------------------
// Manutenção Predial
// ---------------------------------------------------------------------------

export const FACILITY_SPECIALTY_LABELS: Record<string, string> = {
  electrical: 'Elétrica',
  plumbing: 'Hidráulica',
  civil: 'Civil',
  hvac: 'Climatização (HVAC)',
  roofing: 'Cobertura/telhado',
  gardening: 'Jardinagem',
  other: 'Outro',
};

export function MaintenanceTicketPriorityBadge({ priority }: { priority: MaintenanceTicketPriority }) {
  switch (priority) {
    case 'emergency':
      return <Badge variant="destructive">Emergência</Badge>;
    case 'high':
      return <Badge variant="warning">Alta</Badge>;
    case 'normal':
      return <Badge variant="outline">Normal</Badge>;
    case 'low':
      return <Badge variant="secondary">Baixa</Badge>;
    default:
      return <Badge variant="outline">{priority}</Badge>;
  }
}

export const MAINTENANCE_TICKET_STATUS_LABELS: Record<MaintenanceTicketStatus, string> = {
  open: 'Aberto',
  scheduled: 'Agendado',
  in_progress: 'Em execução',
  waiting_parts: 'Aguardando peças',
  completed: 'Concluído',
  canceled: 'Cancelado',
};

export function MaintenanceTicketStatusBadge({ status }: { status: MaintenanceTicketStatus }) {
  switch (status) {
    case 'open':
      return <Badge variant="warning">Aberto</Badge>;
    case 'scheduled':
      return <Badge variant="outline">Agendado</Badge>;
    case 'in_progress':
      return <Badge variant="secondary">Em execução</Badge>;
    case 'waiting_parts':
      return <Badge variant="warning">Aguardando peças</Badge>;
    case 'completed':
      return <Badge variant="success">Concluído</Badge>;
    case 'canceled':
      return <Badge variant="destructive">Cancelado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ---------------------------------------------------------------------------
// Visitantes
// ---------------------------------------------------------------------------

export function VisitStatusBadge({ status }: { status: VisitStatus }) {
  switch (status) {
    case 'scheduled':
      return <Badge variant="outline">Agendada</Badge>;
    case 'onsite':
      return <Badge variant="warning">No local</Badge>;
    case 'completed':
      return <Badge variant="success">Concluída</Badge>;
    case 'no_show':
      return <Badge variant="secondary">Não compareceu</Badge>;
    case 'canceled':
      return <Badge variant="destructive">Cancelada</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ---------------------------------------------------------------------------
// Limpeza
// ---------------------------------------------------------------------------

export const CLEANING_FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Diária',
  alternate: 'Dias alternados',
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
};

// ---------------------------------------------------------------------------
// Reserva de recursos
// ---------------------------------------------------------------------------

export const RESERVATION_RESOURCE_TYPE_LABELS: Record<string, string> = {
  room: 'Sala',
  equipment: 'Equipamento',
};

export function ReservationStatusBadge({ status }: { status: string }) {
  if (status === 'confirmed') return <Badge variant="success">Confirmada</Badge>;
  if (status === 'canceled') return <Badge variant="destructive">Cancelada</Badge>;
  return <Badge variant="secondary">Concluída</Badge>;
}

// ---------------------------------------------------------------------------
// Correspondência
// ---------------------------------------------------------------------------

export const CORRESPONDENCE_TYPE_LABELS: Record<string, string> = {
  letter: 'Carta',
  package: 'Encomenda',
  document: 'Documento',
  other: 'Outro',
};
