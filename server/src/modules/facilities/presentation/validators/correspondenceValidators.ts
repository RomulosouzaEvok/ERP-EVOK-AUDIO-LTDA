/**
 * Schemas Zod (strict) para os endpoints de Correspondência
 * (`/api/facilities/correspondences`).
 *
 * @module modules/facilities/presentation/validators/correspondenceValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

export const createCorrespondenceSchema = z.object({
  received_at: z.string().trim().optional(),
  sender: z.string().trim().max(150).optional(),
  recipient_employee_id: z.coerce.number().int().positive().optional(),
  recipient_department_id: z.coerce.number().int().positive().optional(),
  type: z.enum(['letter', 'package', 'document', 'other']).default('other'),
  notes: z.string().trim().max(2000).optional(),
}).strict();

export const deliverCorrespondenceSchema = z.object({
  delivered_to: z.string().trim().min(1, 'delivered_to é obrigatório.').max(150),
}).strict();

export const listCorrespondenceQuerySchema = z.object({
  delivered: z.coerce.boolean().optional(),
  recipient_employee_id: z.coerce.number().int().positive().optional(),
  recipient_department_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = { createCorrespondenceSchema, deliverCorrespondenceSchema, listCorrespondenceQuerySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
