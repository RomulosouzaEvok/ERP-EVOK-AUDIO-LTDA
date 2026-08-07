import { Badge } from '@/components/ui/badge';
import type {
  ContractStatus,
  ContractType,
  CaseStatus,
  CaseType,
  RiskClass,
  DeadlineStatus,
  ProxyStatus,
  IpStatus,
  IpType,
  DataSubjectRequestStatus,
  IncidentStatus,
  AlertStatus,
} from '@/api/juridico';

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

/**
 * Formata um DECIMAL string (`"150000.000000"`) como moeda BR para EXIBIÇÃO
 * apenas — nunca usar o `number` resultante para reenviar ao backend
 * (payloads de escrita mandam o `string` original do input, sem passar por
 * aqui, preservando a precisão DECIMAL(18,6) do banco).
 */
export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(numeric)) return '-';
  return numeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  commercial: 'Comercial',
  employment: 'Trabalhista',
  supplier: 'Fornecimento',
  service: 'Prestação de serviços',
  rental: 'Locação',
  nda: 'Confidencialidade (NDA)',
  distribution: 'Distribuição',
  commercial_representation: 'Representação comercial',
  trademark_license: 'Licenciamento de marca',
  other: 'Outro',
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'Rascunho',
  in_approval: 'Em aprovação',
  approved: 'Aprovado',
  signed: 'Assinado',
  active: 'Ativo',
  expired: 'Vencido',
  terminated: 'Rescindido',
  canceled: 'Cancelado',
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  switch (status) {
    case 'draft':
      return <Badge variant="outline">Rascunho</Badge>;
    case 'in_approval':
    case 'approved':
      return <Badge variant="secondary">{CONTRACT_STATUS_LABELS[status]}</Badge>;
    case 'signed':
      return <Badge variant="warning">Assinado</Badge>;
    case 'active':
      return <Badge variant="success">Ativo</Badge>;
    case 'expired':
      return <Badge variant="outline">Vencido</Badge>;
    case 'terminated':
    case 'canceled':
      return <Badge variant="destructive">{CONTRACT_STATUS_LABELS[status]}</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ---------------------------------------------------------------------------
// Contencioso
// ---------------------------------------------------------------------------

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  labor: 'Trabalhista',
  civil: 'Cível',
  tax: 'Tributário',
  consumer: 'Consumidor',
  regulatory: 'Regulatório',
  administrative: 'Administrativo',
};

export const CASE_ROLE_LABELS: Record<string, string> = {
  plaintiff: 'Autor',
  defendant: 'Réu',
  third_party: 'Terceiro',
};

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  switch (status) {
    case 'active':
      return <Badge variant="warning">Ativo</Badge>;
    case 'won':
      return <Badge variant="success">Ganho</Badge>;
    case 'lost':
      return <Badge variant="destructive">Perdido</Badge>;
    case 'settled':
      return <Badge variant="secondary">Acordo</Badge>;
    case 'archived':
      return <Badge variant="outline">Arquivado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export const RISK_CLASS_LABELS: Record<RiskClass, string> = {
  probable: 'Provável',
  possible: 'Possível',
  remote: 'Remoto',
};

export function RiskClassBadge({ riskClass }: { riskClass: RiskClass | null | undefined }) {
  if (!riskClass) return <Badge variant="outline">Não avaliado</Badge>;
  if (riskClass === 'probable') return <Badge variant="destructive">Provável</Badge>;
  if (riskClass === 'possible') return <Badge variant="warning">Possível</Badge>;
  return <Badge variant="secondary">Remoto</Badge>;
}

// ---------------------------------------------------------------------------
// Prazos fatais
// ---------------------------------------------------------------------------

export const DEADLINE_STATUS_LABELS: Record<DeadlineStatus, string> = {
  pending: 'Pendente',
  fulfilled_pending_confirmation: 'Aguardando 2ª confirmação',
  confirmed: 'Confirmado',
  missed: 'Perdido',
  confirmed_late: 'Confirmado (retroativo)',
};

export function DeadlineStatusBadge({ status }: { status: DeadlineStatus }) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline">Pendente</Badge>;
    case 'fulfilled_pending_confirmation':
      return <Badge variant="warning">Aguardando 2ª confirmação</Badge>;
    case 'confirmed':
      return <Badge variant="success">Confirmado</Badge>;
    case 'confirmed_late':
      return <Badge variant="secondary">Confirmado (retroativo)</Badge>;
    case 'missed':
      return <Badge variant="destructive">Perdido</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

/** Semáforo de urgência por dias restantes até `due_date` — usado na aba Prazos Fatais. */
export function daysUntil(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function UrgencyBadge({ dueDate, status }: { dueDate: string; status: DeadlineStatus }) {
  if (status === 'confirmed' || status === 'confirmed_late') return <Badge variant="success">Cumprido</Badge>;
  const remaining = daysUntil(dueDate);
  if (status === 'missed' || remaining < 0) return <Badge variant="destructive">Vencido ({Math.abs(remaining)}d)</Badge>;
  if (remaining <= 3) return <Badge variant="destructive">{remaining}d — crítico</Badge>;
  if (remaining <= 7) return <Badge variant="warning">{remaining}d — atenção</Badge>;
  return <Badge variant="outline">{remaining}d</Badge>;
}

// ---------------------------------------------------------------------------
// Procurações
// ---------------------------------------------------------------------------

export function ProxyStatusBadge({ status }: { status: ProxyStatus }) {
  if (status === 'active') return <Badge variant="success">Ativa</Badge>;
  if (status === 'revoked') return <Badge variant="destructive">Revogada</Badge>;
  return <Badge variant="outline">Vencida</Badge>;
}

// ---------------------------------------------------------------------------
// Propriedade Intelectual
// ---------------------------------------------------------------------------

export const IP_TYPE_LABELS: Record<IpType, string> = {
  trademark: 'Marca',
  patent: 'Patente',
  utility_model: 'Modelo de utilidade',
  industrial_design: 'Desenho industrial',
  copyright: 'Direito autoral',
  trade_secret: 'Segredo industrial',
};

export function IpStatusBadge({ status }: { status: IpStatus }) {
  switch (status) {
    case 'filed':
      return <Badge variant="outline">Depositado</Badge>;
    case 'granted':
      return <Badge variant="secondary">Concedido</Badge>;
    case 'active':
      return <Badge variant="success">Ativo</Badge>;
    case 'expired':
      return <Badge variant="destructive">Vencido</Badge>;
    case 'abandoned':
      return <Badge variant="destructive">Abandonado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ---------------------------------------------------------------------------
// LGPD
// ---------------------------------------------------------------------------

export const LEGAL_BASIS_LABELS: Record<string, string> = {
  consent: 'Consentimento',
  legal_obligation: 'Cumprimento de obrigação legal',
  public_administration: 'Execução de políticas públicas',
  research: 'Estudos e pesquisa',
  contract_execution: 'Execução de contrato',
  judicial_process: 'Exercício regular de direitos',
  life_protection: 'Proteção da vida',
  health_protection: 'Tutela da saúde',
  legitimate_interest: 'Legítimo interesse',
  credit_protection: 'Proteção ao crédito',
};

export const DATA_SUBJECT_REQUEST_TYPE_LABELS: Record<string, string> = {
  confirmation: 'Confirmação de tratamento',
  access: 'Acesso',
  correction: 'Correção',
  anonymization: 'Anonimização',
  deletion: 'Eliminação',
  portability: 'Portabilidade',
  consent_revocation: 'Revogação de consentimento',
  info_sharing: 'Informação sobre compartilhamento',
};

export function DataSubjectRequestStatusBadge({ status }: { status: DataSubjectRequestStatus }) {
  switch (status) {
    case 'received':
      return <Badge variant="outline">Recebida</Badge>;
    case 'verifying':
      return <Badge variant="warning">Verificando identidade</Badge>;
    case 'in_progress':
      return <Badge variant="secondary">Em andamento</Badge>;
    case 'answered':
      return <Badge variant="success">Respondida</Badge>;
    case 'rejected_justified':
      return <Badge variant="destructive">Recusada (justificada)</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  if (status === 'open') return <Badge variant="destructive">Aberto</Badge>;
  if (status === 'investigating') return <Badge variant="warning">Investigando</Badge>;
  return <Badge variant="success">Encerrado</Badge>;
}

export const COMMUNICATION_DECISION_LABELS: Record<string, string> = {
  communicate_anpd: 'Comunicar ANPD',
  communicate_subjects: 'Comunicar titulares',
  communicate_both: 'Comunicar ANPD e titulares',
  not_communicate: 'Não comunicar',
};

// ---------------------------------------------------------------------------
// Alertas transversais
// ---------------------------------------------------------------------------

export const ALERT_ORIGIN_LABELS: Record<string, string> = {
  contract: 'Contrato',
  proxy: 'Procuração',
  intellectual_property: 'Propriedade Intelectual',
  lgpd_request: 'Solicitação LGPD',
  legal_case_deadline: 'Prazo processual',
};

export function AlertStatusBadge({ status }: { status: AlertStatus }) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline">Pendente</Badge>;
    case 'acknowledged':
      return <Badge variant="secondary">Reconhecido</Badge>;
    case 'escalated':
      return <Badge variant="destructive">Escalado</Badge>;
    case 'resolved':
      return <Badge variant="success">Resolvido</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
