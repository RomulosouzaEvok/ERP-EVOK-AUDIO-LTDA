/**
 * DTOs de entrada/saída do recurso ItTicket/ItTicketCategory/ItTicketComment.
 *
 * Extraído em arquivo próprio (somente `export interface`/`export type`)
 * para evitar a armadilha ESM+CJS no mesmo arquivo — mesma convenção de
 * `ProductionDowntimeTypes.ts` (ver `docs/business/BLOCO_2_TI_API.md`,
 * seção "Estrutura de módulo").
 *
 * @module modules/ti/domain/entities/TicketTypes
 */

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed' | 'canceled';

export interface CreateTicketInput {
  subject: string;
  description?: string;
  category_id: number;
  asset_id?: number | null;
  urgency_perceived?: TicketPriority;
  opened_on_behalf_of?: number | null;
  requesterId: number | null;
  requesterHasTiOperate: boolean;
  systemGenerated?: boolean;
}

export interface AssignTicketInput {
  id: number;
  assignedTo: number;
  category_id?: number;
  impact?: number;
  urgency?: number;
}

export interface ChangeTicketPriorityInput {
  id: number;
  priority: TicketPriority;
  impact?: number;
  urgency?: number;
  reason?: string;
  changedBy: number;
}

export interface ResolveTicketInput {
  id: number;
  solution: string;
}

export interface ConfirmTicketInput {
  id: number;
  satisfaction_rating?: number;
  satisfaction_comment?: string;
}

export interface ReopenTicketInput {
  id: number;
  requestingUserId: number;
  hasTiOperate: boolean;
}

export interface AddTicketCommentInput {
  ticketId: number;
  authorId: number;
  body: string;
  isInternal: boolean;
  authorHasTiModule: boolean;
}
