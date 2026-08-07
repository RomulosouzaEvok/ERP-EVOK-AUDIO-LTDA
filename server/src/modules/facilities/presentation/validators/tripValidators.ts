/**
 * Schemas Zod (strict) para os endpoints de Diário de Uso
 * (`/api/facilities/trips`).
 *
 * @module modules/facilities/presentation/validators/tripValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const purposeEnum = z.enum(['delivery', 'executive', 'errand', 'other']);

export const createTripSchema = z.object({
  asset_id: z.coerce.number().int().positive('asset_id é obrigatório.'),
  driver_id: z.coerce.number().int().positive('driver_id é obrigatório.'),
  purpose: purposeEnum,
  destination: z.string().trim().max(200).optional(),
  scheduled_departure_at: z.string().trim().optional(),
}).strict();

export const departTripSchema = z.object({
  departure_km: z.coerce.number().int().min(0).optional(),
  fuel_level_out: z.coerce.number().int().min(0).max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
  divergence_justification: z.string().trim().max(2000).optional(),
}).strict();

export const returnTripSchema = z.object({
  return_km: z.coerce.number().int().min(0, 'return_km é obrigatório.'),
  fuel_level_in: z.coerce.number().int().min(0).max(100).optional(),
  incidents: z.string().trim().max(2000).optional(),
}).strict();

export const cancelTripSchema = z.object({
  cancel_reason: z.string().trim().min(1, 'cancel_reason é obrigatório.'),
}).strict();

export const listTripQuerySchema = z.object({
  asset_id: z.coerce.number().int().positive().optional(),
  driver_id: z.coerce.number().int().positive().optional(),
  status: z.enum(['scheduled', 'out', 'returned', 'canceled']).optional(),
  purpose: purposeEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = { createTripSchema, departTripSchema, returnTripSchema, cancelTripSchema, listTripQuerySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
