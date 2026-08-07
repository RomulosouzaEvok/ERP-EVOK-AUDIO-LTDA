/**
 * Schemas Zod (strict) para os endpoints de Evento/Feira de Marketing
 * (`/api/marketing/events`), NOVO no BLOCO 5 MKT (correção) — RF-MKT-020
 * a 025.
 *
 * @module modules/marketing/presentation/validators/eventValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const eventTypeEnum = z.enum(['feira', 'lancamento', 'workshop', 'regional']);
const eventStatusEnum = z.enum(['planned', 'in_progress', 'completed', 'canceled']);
const checklistItemStatusEnum = z.enum(['pending', 'done']);

export const createEventSchema = z.object({
  name: z.string().trim().min(1, 'name é obrigatório.').max(200),
  location: z.string().trim().max(255).optional(),
  event_type: eventTypeEnum,
  campaign_id: z.coerce.number().int().positive().optional(),
  start_date: z.string().trim().min(1, 'start_date é obrigatório.'),
  end_date: z.string().trim().optional(),
  budget: z.coerce.number().min(0).optional(),
}).strict();

export const updateEventSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  location: z.string().trim().max(255).nullable().optional(),
  event_type: eventTypeEnum.optional(),
  campaign_id: z.coerce.number().int().positive().nullable().optional(),
  start_date: z.string().trim().min(1).optional(),
  end_date: z.string().trim().nullable().optional(),
  budget: z.coerce.number().min(0).optional(),
  actual_cost: z.coerce.number().min(0).optional(),
  status: eventStatusEnum.optional(),
}).strict();

export const closeEventSchema = z.object({
  actual_cost: z.coerce.number().min(0).optional(),
}).strict();

export const addChecklistItemSchema = z.object({
  description: z.string().trim().min(1, 'description é obrigatório.').max(255),
  responsible_user_id: z.coerce.number().int().positive().optional(),
}).strict();

export const updateChecklistItemSchema = z.object({
  description: z.string().trim().min(1).max(255).optional(),
  status: checklistItemStatusEnum.optional(),
  responsible_user_id: z.coerce.number().int().positive().nullable().optional(),
}).strict();

export const listEventQuerySchema = z.object({
  status: eventStatusEnum.optional(),
  event_type: eventTypeEnum.optional(),
  campaign_id: z.coerce.number().int().positive().optional(),
  date_from: z.string().trim().optional(),
  date_to: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = {
  createEventSchema, updateEventSchema, closeEventSchema,
  addChecklistItemSchema, updateChecklistItemSchema, listEventQuerySchema,
};

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
