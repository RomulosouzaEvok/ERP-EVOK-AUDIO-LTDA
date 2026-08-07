/**
 * Schemas Zod (strict) para os endpoints de Programação de Limpeza
 * (`/api/facilities/cleaning-schedules`).
 *
 * @module modules/facilities/presentation/validators/cleaningScheduleValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const frequencyEnum = z.enum(['daily', 'alternate', 'weekly', 'biweekly', 'monthly']);

export const createCleaningScheduleSchema = z.object({
  area: z.string().trim().min(1, 'Área é obrigatória.').max(100),
  frequency: frequencyEnum,
  responsible_person: z.string().trim().max(100).optional(),
  last_cleaning: z.string().trim().optional(),
  next_cleaning: z.string().trim().optional(),
  notes: z.string().trim().max(2000).optional(),
}).strict();

export const updateCleaningScheduleSchema = z.object({
  area: z.string().trim().min(1).max(100).optional(),
  frequency: frequencyEnum.optional(),
  responsible_person: z.string().trim().max(100).optional(),
  last_cleaning: z.string().trim().optional(),
  next_cleaning: z.string().trim().optional(),
  notes: z.string().trim().max(2000).optional(),
}).strict();

export const listCleaningScheduleQuerySchema = z.object({
  frequency: frequencyEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = { createCleaningScheduleSchema, updateCleaningScheduleSchema, listCleaningScheduleQuerySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
