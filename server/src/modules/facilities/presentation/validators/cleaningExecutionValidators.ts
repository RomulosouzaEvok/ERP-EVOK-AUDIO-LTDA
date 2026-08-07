/**
 * Schemas Zod (strict) para os endpoints de Execução de Limpeza
 * (`/api/facilities/cleaning-executions`).
 *
 * @module modules/facilities/presentation/validators/cleaningExecutionValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

export const createCleaningExecutionSchema = z.object({
  plan_id: z.coerce.number().int().positive('plan_id é obrigatório.'),
  executed_at: z.string().trim().optional(),
  ok: z.boolean().default(true),
  notes: z.string().trim().max(2000).optional(),
  supplies_consumed: z.array(z.object({ item_id: z.string().min(1), quantity: z.coerce.number().positive(), unit: z.string().optional() })).optional(),
}).strict();

export const listCleaningExecutionQuerySchema = z.object({
  plan_id: z.coerce.number().int().positive().optional(),
  ok: z.coerce.boolean().optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = { createCleaningExecutionSchema, listCleaningExecutionQuerySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
