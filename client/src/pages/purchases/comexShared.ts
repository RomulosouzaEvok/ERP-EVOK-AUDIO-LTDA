import axios from 'axios';

import type * as comexApi from '@/api/comex';
import { IMPORT_APPROVAL_RULE } from '@/api/comex';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';

/**
 * Rótulos e tradução de erros compartilhados pela tela de Importação/COMEX
 * (`ComexPage.tsx` + `ImportApprovalGateCard.tsx`).
 *
 * Fica separado da página porque o card do gate de aprovação da diretoria
 * (G11-COMEX) precisa dos mesmos rótulos de status/evento, e porque a
 * tradução de erro do gate é a parte que impede o operador de ver um 422 cru
 * ("rule: G11-COMEX, missing_roles: diretor") na tela.
 */

export const STATUS_LABEL: Record<comexApi.ImportProcessStatus, string> = {
  draft: 'Rascunho',
  shipped: 'Embarcado',
  arrived: 'Chegou ao país',
  customs_cleared: 'Desembaraçado',
  received: 'Recebido',
  cancelled: 'Cancelado',
};

export const STATUS_VARIANT: Record<comexApi.ImportProcessStatus, 'secondary' | 'warning' | 'default' | 'success' | 'destructive'> = {
  draft: 'secondary',
  shipped: 'warning',
  arrived: 'warning',
  customs_cleared: 'default',
  received: 'success',
  cancelled: 'destructive',
};

/** Próximo marco de acompanhamento (`POST /:id/tracking`) a partir do status atual — `undefined` quando não há mais marco a registrar. */
export const NEXT_TRACKING_EVENT: Partial<Record<comexApi.ImportProcessStatus, comexApi.ImportTrackingEvent>> = {
  draft: 'shipped',
  shipped: 'arrived',
  arrived: 'customs_cleared',
};

export const TRACKING_EVENT_LABEL: Record<comexApi.ImportTrackingEvent, string> = {
  shipped: 'Embarque',
  arrived: 'Chegada ao país',
  customs_cleared: 'Desembaraço aduaneiro',
};

/** Papéis de alçada do G11-COMEX em linguagem de negócio. */
export const APPROVER_ROLE_LABEL: Record<comexApi.ImportApproverRole, string> = {
  diretor: 'Diretoria',
};

/** Campos congelados no embarque (`details.frozen_fields`), em linguagem de negócio. */
const FROZEN_FIELD_LABEL: Record<string, string> = {
  exchange_rate: 'câmbio',
  freight_value: 'frete',
  insurance_value: 'seguro',
  other_expenses_value: 'outras despesas',
};

export function approverRoleLabel(role: string): string {
  return APPROVER_ROLE_LABEL[role as comexApi.ImportApproverRole] ?? role;
}

/** Recorte de `error.details` que o backend devolve nas violações do gate G11-COMEX. */
interface ComexGateDetails {
  missing_roles?: string[];
  required_roles?: string[];
  frozen_fields?: string[];
  current_status?: string;
  approver_role?: string;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const entries = value.filter((entry): entry is string => typeof entry === 'string');
  return entries.length > 0 ? entries : undefined;
}

/**
 * Lê `error.details` de uma resposta de erro da API **somente** quando ela
 * carrega `rule = 'G11-COMEX'`. Qualquer outro erro (rede, 403, 422 de outra
 * regra) devolve `null` e segue pelo tradutor genérico.
 */
function extractGateDetails(error: unknown): ComexGateDetails | null {
  if (!axios.isAxiosError(error)) return null;

  const body = error.response?.data as { error?: unknown } | undefined;
  const apiError = body?.error;
  if (!apiError || typeof apiError !== 'object') return null;

  const details = (apiError as { details?: unknown }).details;
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null;

  const record = details as Record<string, unknown>;
  if (record.rule !== IMPORT_APPROVAL_RULE) return null;

  return {
    missing_roles: asStringArray(record.missing_roles),
    required_roles: asStringArray(record.required_roles),
    frozen_fields: asStringArray(record.frozen_fields),
    current_status: typeof record.current_status === 'string' ? record.current_status : undefined,
    approver_role: typeof record.approver_role === 'string' ? record.approver_role : undefined,
  };
}

function statusLabel(status: string): string {
  return STATUS_LABEL[status as comexApi.ImportProcessStatus] ?? status;
}

/**
 * Traduz erros da tela de Importação/COMEX para o Padrão Didático de 3
 * partes. Quando o backend barra pelo gate da diretoria (G11-COMEX), monta a
 * explicação em linguagem de fábrica — sem despejar `rule`/`missing_roles`
 * crus e sem repetir a rota HTTP que a mensagem do backend cita. Para
 * qualquer outro erro, delega a {@link translateApiError}.
 *
 * @param error - Erro capturado no `onError` da mutation.
 * @param title - O QUE: ação que não pôde ser concluída.
 */
export function translateComexError(error: unknown, title: string): DidacticError {
  const gate = extractGateDetails(error);
  if (!gate) return translateApiError(error, title);

  const reasons: string[] = [];

  if (gate.missing_roles?.length) {
    reasons.push(
      `Falta a aprovação de: ${gate.missing_roles.map(approverRoleLabel).join(', ')}. Importação exige aprovação em qualquer valor antes do embarque.`,
    );
  }

  if (gate.frozen_fields?.length) {
    reasons.push(
      `No embarque não é possível alterar ${gate.frozen_fields.map((field) => FROZEN_FIELD_LABEL[field] ?? field).join(', ')}: são exatamente os valores que a diretoria aprovou.`,
    );
  }

  if (gate.current_status) {
    reasons.push(
      `O processo está em "${statusLabel(gate.current_status)}" e a aprovação só pode ser registrada enquanto ele está em "${STATUS_LABEL.draft}" (antes do embarque) — não existe aprovação retroativa.`,
    );
  }

  if (gate.approver_role) {
    reasons.push(`${approverRoleLabel(gate.approver_role)} já aprovou este processo — não é preciso aprovar de novo.`);
  }

  if (reasons.length === 0) {
    return translateApiError(error, title);
  }

  const action = gate.frozen_fields?.length
    ? { label: 'Registre o embarque sem valores; para corrigi-los, cancele e recrie o processo.', to: '' }
    : { label: 'Peça à Diretoria para aprovar no bloco "Aprovação da diretoria" deste processo.', to: '' };

  return { title, reasons, action };
}
