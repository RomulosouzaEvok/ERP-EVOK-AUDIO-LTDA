/**
 * Mapper de saída do recurso ItTicket/ItTicketCategory/ItTicketComment.
 *
 * Diferente dos mappers PT-BR↔inglês do módulo `sst`, as tabelas `it_*`
 * já usam nomes em inglês (ver `docs/business/BLOCO_2_TI_MODELO_DADOS.md`
 * §0) — este mapper é mais fino: apenas achata a instância Sequelize,
 * calcula `sla_overdue` (leitura, nunca persistido) e filtra comentários
 * `is_internal` para quem não tem o módulo `ti` (RF-TI-014).
 *
 * @module modules/ti/infrastructure/mappers/TicketMapper
 */

import { isSlaOverdue } from '../../domain/services/ticketPolicyService';

function plain(row: any): any {
  return row && typeof row.get === 'function' ? row.get({ plain: true }) : row;
}

/** Converte uma instância `ItTicket` para o DTO de resposta (visão resumida, sem comentários). */
export function toTicketSummaryDTO(row: any): Record<string, unknown> {
  const p = plain(row);
  return {
    id: p.id,
    ticket_number: p.ticket_number,
    subject: p.subject,
    status: p.status,
    priority: p.priority,
    category: p.category ? { id: p.category.id, name: p.category.name } : undefined,
    requester: p.requester ? { id: p.requester.id, name: p.requester.name } : null,
    assigned_to: p.assignedToUser ? { id: p.assignedToUser.id, name: p.assignedToUser.name } : null,
    asset: p.asset ? { id: p.asset.id, tag: p.asset.tag, name: p.asset.name } : null,
    sla_response_due_at: p.sla_response_due_at,
    sla_resolution_due_at: p.sla_resolution_due_at,
    sla_overdue: isSlaOverdue(p),
    system_generated: p.system_generated,
    createdAt: p.createdAt,
  };
}

/** Converte uma instância `ItTicket` para o DTO de detalhe (inclui comentários já filtrados pelo use case). */
export function toTicketDetailDTO(row: any, comments: Record<string, unknown>[] = []): Record<string, unknown> {
  return {
    ...toTicketSummaryDTO(row),
    description: plain(row).description,
    solution: plain(row).solution,
    impact: plain(row).impact,
    urgency: plain(row).urgency,
    first_response_at: plain(row).first_response_at,
    resolved_at: plain(row).resolved_at,
    closed_at: plain(row).closed_at,
    waiting_minutes: plain(row).waiting_minutes,
    satisfaction_rating: plain(row).satisfaction_rating,
    satisfaction_comment: plain(row).satisfaction_comment,
    maintenance_order_id: plain(row).maintenance_order_id,
    access_request_id: plain(row).access_request_id,
    comments,
  };
}

/** Converte uma instância `ItTicketComment` para DTO. Omite `body` se `is_internal` e o leitor não tem módulo `ti`. */
export function toCommentDTO(row: any, viewerHasTiModule: boolean): Record<string, unknown> | null {
  const p = plain(row);
  if (p.is_internal && !viewerHasTiModule) return null;
  return {
    id: p.id,
    author: p.author ? { id: p.author.id, name: p.author.name } : null,
    body: p.body,
    is_internal: p.is_internal,
    created_at: p.created_at,
  };
}

/** Converte uma instância `ItTicketCategory` para DTO. */
export function toCategoryDTO(row: any): Record<string, unknown> {
  const p = plain(row);
  return { id: p.id, name: p.name, description: p.description, default_priority: p.default_priority, active: p.active };
}
