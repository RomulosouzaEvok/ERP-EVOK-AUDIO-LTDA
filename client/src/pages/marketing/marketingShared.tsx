import { Badge } from '@/components/ui/badge';
import type {
  BudgetAlertLevel,
  BudgetApprovalStatus,
  CampaignStatus,
  CampaignType,
  ChecklistItemStatus,
  ConsentChannel,
  EventStatus,
  EventType,
  LeadSource,
  LeadStatus,
  MaterialType,
} from '@/api/marketing';

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

/**
 * Formata um DECIMAL string (`"150000.00"`) como moeda BR para EXIBIÇÃO
 * apenas — nunca usar o `number` resultante para reenviar ao backend
 * (payloads de escrita mandam o valor original do input, sem passar por
 * aqui, preservando precisão).
 */
export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(numeric)) return '-';
  return numeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Formata uma proporção decimal (`"0.62"`) como percentual (`"62%"`) para exibição. */
export function formatPercent(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(numeric)) return '-';
  return `${(numeric * 100).toFixed(0)}%`;
}

// ---------------------------------------------------------------------------
// Campanhas
// ---------------------------------------------------------------------------

export const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  ads: 'Mídia paga (Ads)',
  social: 'Redes sociais',
  email: 'Email marketing',
  event: 'Evento/Feira',
  trade: 'Trade marketing',
  content: 'Conteúdo',
};

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  planned: 'Planejada',
  active: 'Ativa',
  paused: 'Pausada',
  completed: 'Concluída',
  canceled: 'Cancelada',
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  switch (status) {
    case 'planned':
      return <Badge variant="secondary">Planejada</Badge>;
    case 'active':
      return <Badge variant="success">Ativa</Badge>;
    case 'paused':
      return <Badge variant="warning">Pausada</Badge>;
    case 'completed':
      return <Badge variant="secondary">Concluída</Badge>;
    case 'canceled':
      return <Badge variant="destructive">Cancelada</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export const BUDGET_APPROVAL_STATUS_LABELS: Record<BudgetApprovalStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

export function BudgetApprovalBadge({ status }: { status: BudgetApprovalStatus }) {
  if (status === 'approved') return <Badge variant="success">Orçamento aprovado</Badge>;
  if (status === 'rejected') return <Badge variant="destructive">Orçamento rejeitado</Badge>;
  return <Badge variant="outline">Orçamento pendente</Badge>;
}

export function BudgetAlertBadge({ level }: { level: BudgetAlertLevel | null | undefined }) {
  if (!level || level === 'none') return null;
  if (level === 'over_100') return <Badge variant="destructive">Estourou o orçamento</Badge>;
  return <Badge variant="warning">Próximo do limite (90%)</Badge>;
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  website: 'Site',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google: 'Google',
  email: 'Email',
  event: 'Evento',
  indication: 'Indicação',
  other: 'Outro',
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Novo',
  contacted: 'Contatado',
  qualified: 'Qualificado',
  in_sales_attendance: 'Em atendimento (Vendas)',
  converted: 'Convertido',
  lost: 'Perdido',
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  switch (status) {
    case 'new':
      return <Badge variant="outline">Novo</Badge>;
    case 'contacted':
      return <Badge variant="secondary">Contatado</Badge>;
    case 'qualified':
      return <Badge variant="warning">Qualificado</Badge>;
    case 'in_sales_attendance':
      return <Badge variant="warning">Em atendimento</Badge>;
    case 'converted':
      return <Badge variant="success">Convertido</Badge>;
    case 'lost':
      return <Badge variant="destructive">Perdido</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export const CONSENT_CHANNEL_LABELS: Record<ConsentChannel, string> = {
  formulario_site: 'Formulário do site',
  whatsapp: 'WhatsApp',
  telefone: 'Telefone',
  feira: 'Feira',
  indicacao: 'Indicação',
  outro: 'Outro',
};

// ---------------------------------------------------------------------------
// Evento/Feira
// ---------------------------------------------------------------------------

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  feira: 'Feira',
  lancamento: 'Lançamento',
  workshop: 'Workshop',
  regional: 'Regional',
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  planned: 'Planejado',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  canceled: 'Cancelado',
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  switch (status) {
    case 'planned':
      return <Badge variant="secondary">Planejado</Badge>;
    case 'in_progress':
      return <Badge variant="warning">Em andamento</Badge>;
    case 'completed':
      return <Badge variant="success">Concluído</Badge>;
    case 'canceled':
      return <Badge variant="destructive">Cancelado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export const CHECKLIST_STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  pending: 'Pendente',
  done: 'Concluído',
};

// ---------------------------------------------------------------------------
// Materiais
// ---------------------------------------------------------------------------

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  catalog: 'Catálogo',
  flyer: 'Flyer',
  banner: 'Banner',
  video: 'Vídeo',
  manual: 'Manual',
  technical_sheet: 'Ficha técnica',
  presentation: 'Apresentação',
};
