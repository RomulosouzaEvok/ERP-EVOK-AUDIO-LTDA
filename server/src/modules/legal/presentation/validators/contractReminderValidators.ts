/**
 * Schemas Zod (strict) para os endpoints de Lembrete de Prazo Contratual
 * (`/api/legal/contract-reminders`).
 *
 * @module modules/legal/presentation/validators/contractReminderValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const reminderTypeEnum = z.enum(['renewal', 'expiration', 'notice', 'payment']);

export const createReminderSchema = z.object({
  contract_id: z.coerce.number().int().positive('contract_id é obrigatório.'),
  reminder_type: reminderTypeEnum,
  reminder_date: z.string().trim().min(1, 'reminder_date é obrigatório.'),
  days_before: z.coerce.number().int().min(0).optional(),
  notified: z.boolean().optional(),
}).strict();

export const updateReminderSchema = z.object({
  reminder_type: reminderTypeEnum.optional(),
  reminder_date: z.string().trim().min(1).optional(),
  days_before: z.coerce.number().int().min(0).optional(),
  notified: z.boolean().optional(),
}).strict();

export const listReminderQuerySchema = z.object({
  contract_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = { createReminderSchema, updateReminderSchema, listReminderQuerySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
