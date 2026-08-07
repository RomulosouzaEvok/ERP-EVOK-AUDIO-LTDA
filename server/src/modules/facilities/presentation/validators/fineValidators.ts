/**
 * Schemas Zod (strict) para os endpoints de Multa
 * (`/api/facilities/fines`).
 *
 * @module modules/facilities/presentation/validators/fineValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

export const createFineSchema = z.object({
  asset_id: z.coerce.number().int().positive('asset_id é obrigatório.'),
  infraction_at: z.string().trim().min(1, 'infraction_at é obrigatório.'),
  location: z.string().trim().max(200).optional(),
  infraction_code: z.string().trim().min(1, 'infraction_code é obrigatório.').max(20),
  description: z.string().trim().max(2000).optional(),
  amount: z.coerce.number().positive('amount deve ser maior que zero.'),
  points: z.coerce.number().int().min(0).max(20).optional(),
  notice_received_at: z.string().trim().optional(),
}).strict();

export const indicateFineSchema = z.object({
  identified_driver_id: z.coerce.number().int().positive('identified_driver_id é obrigatório.'),
  indicated_at: z.string().trim().min(1, 'indicated_at é obrigatório.'),
  protocol_number: z.string().trim().max(100).optional(),
}).strict();

export const payFineSchema = z.object({
  payment_date: z.string().trim().min(1, 'payment_date é obrigatório.'),
  cost_center_id: z.coerce.number().int().positive().optional(),
}).strict();

export const chargeDriverFineSchema = z.object({
  financial_ref: z.string().trim().min(1, 'financial_ref é obrigatório.').max(150),
}).strict();

export const listFineQuerySchema = z.object({
  asset_id: z.coerce.number().int().positive().optional(),
  indication_status: z.enum(['pending', 'indicated', 'expired_nic', 'not_applicable']).optional(),
  status: z.enum(['open', 'paid', 'appealed', 'canceled']).optional(),
  deadline_expiring_days: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = { createFineSchema, indicateFineSchema, payFineSchema, chargeDriverFineSchema, listFineQuerySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
