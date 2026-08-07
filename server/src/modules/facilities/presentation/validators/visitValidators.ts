/**
 * Schemas Zod (strict) para os endpoints de Visitante/Visita
 * (`/api/facilities/visitors`, `/api/facilities/visits`).
 *
 * @module modules/facilities/presentation/validators/visitValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

export const createVisitorSchema = z.object({
  name: z.string().trim().min(1, 'name é obrigatório.').max(150),
  document: z.string().trim().min(1, 'document é obrigatório.').max(30),
  company: z.string().trim().max(150).optional(),
  phone: z.string().trim().max(20).optional(),
  photo_path: z.string().trim().max(500).optional(),
}).strict();

export const listVisitorQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export const createVisitSchema = z.object({
  visitor: createVisitorSchema,
  host_employee_id: z.coerce.number().int().positive('host_employee_id é obrigatório.'),
  scheduled_at: z.string().trim().nullable().optional(),
  badge_number: z.string().trim().max(20).optional(),
  purpose: z.string().trim().max(200).optional(),
  areas_authorized: z.array(z.string()).optional(),
}).strict();

export const listVisitQuerySchema = z.object({
  status: z.enum(['scheduled', 'onsite', 'completed', 'no_show', 'canceled']).optional(),
  host_employee_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = { createVisitorSchema, listVisitorQuerySchema, createVisitSchema, listVisitQuerySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
