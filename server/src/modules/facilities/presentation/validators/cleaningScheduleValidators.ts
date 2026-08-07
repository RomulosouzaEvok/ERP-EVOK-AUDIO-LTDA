/**
 * Schemas Zod (strict) para os endpoints de Plano de Limpeza
 * (`/api/facilities/cleaning-schedules`). `area` (texto livre) continua
 * obrigatório mesmo quando `facility_area_id` é informado — fallback
 * consciente para não quebrar telas existentes (§9.1 do contrato de API).
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
  facility_area_id: z.coerce.number().int().positive().optional(),
  responsible_employee_id: z.coerce.number().int().positive().optional(),
  active: z.boolean().default(true),
}).strict();

export const updateCleaningScheduleSchema = z.object({
  area: z.string().trim().min(1).max(100).optional(),
  frequency: frequencyEnum.optional(),
  responsible_person: z.string().trim().max(100).optional(),
  last_cleaning: z.string().trim().optional(),
  next_cleaning: z.string().trim().optional(),
  notes: z.string().trim().max(2000).optional(),
  facility_area_id: z.coerce.number().int().positive().optional(),
  responsible_employee_id: z.coerce.number().int().positive().optional(),
  active: z.boolean().optional(),
}).strict();

export const listCleaningScheduleQuerySchema = z.object({
  frequency: frequencyEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export const adherenceQuerySchema = z.object({
  from: z.string().trim().min(1, 'from é obrigatório.'),
  to: z.string().trim().min(1, 'to é obrigatório.'),
}).strict();

const schemas = { createCleaningScheduleSchema, updateCleaningScheduleSchema, listCleaningScheduleQuerySchema, adherenceQuerySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
