/**
 * Schemas Zod (strict) para os endpoints de Categoria de Chamado e de
 * reclassificação de prioridade (`/api/ti/ticket-categories`,
 * `/api/ti/tickets/:id/priority`) — valida `default_priority`/`priority`
 * contra os enums reais de `it_ticket_categories`/`it_tickets`
 * (`server/migrations/20260807-000150-create-it-ticket-categories-tickets.cjs`)
 * antes de chegar ao Sequelize, evitando `invalid input value for enum`
 * (500) e devolvendo `ValidationError` (400).
 *
 * `POST /api/ti/tickets` (abertura de chamado) e
 * `POST /api/ti/tickets/:id/assign` NÃO precisam de validador aqui: a
 * `priority` do chamado é sempre derivada internamente pelo use case
 * (herdada de `category.default_priority`, com `urgency_perceived`
 * validado por comparação de índice — valor fora do enum é simplesmente
 * ignorado, nunca chega ao `.create()`), nunca escrita diretamente do
 * `req.body` no Sequelize.
 *
 * @module modules/ti/presentation/validators/ticketValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const priorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);

/** `POST /api/ti/ticket-categories`. */
export const createTicketCategorySchema = z.object({
  name: z.string().trim().min(1, 'name é obrigatório.').max(100),
  description: z.string().trim().max(2000).optional(),
  default_priority: priorityEnum.optional(),
  active: z.boolean().optional(),
}).strict();

/** `PUT /api/ti/ticket-categories/:id`. */
export const updateTicketCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(2000).optional(),
  default_priority: priorityEnum.optional(),
  active: z.boolean().optional(),
}).strict();

/** `PUT /api/ti/tickets/:id/priority`. */
export const changeTicketPrioritySchema = z.object({
  priority: priorityEnum,
  impact: z.coerce.number().int().min(1).max(3).optional(),
  urgency: z.coerce.number().int().min(1).max(3).optional(),
  reason: z.string().trim().max(2000).optional(),
}).strict();

const schemas = { createTicketCategorySchema, updateTicketCategorySchema, changeTicketPrioritySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
