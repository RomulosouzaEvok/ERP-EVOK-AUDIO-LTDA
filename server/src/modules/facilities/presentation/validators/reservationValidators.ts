/**
 * Schemas Zod (strict) para os endpoints de Reserva de Recursos
 * (`/api/facilities/resource-reservations`).
 *
 * @module modules/facilities/presentation/validators/reservationValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

export const createReservationSchema = z.object({
  resource_type: z.enum(['room', 'equipment']),
  facility_area_id: z.coerce.number().int().positive().nullable().optional(),
  asset_id: z.coerce.number().int().positive().nullable().optional(),
  starts_at: z.string().trim().min(1, 'starts_at é obrigatório.'),
  ends_at: z.string().trim().min(1, 'ends_at é obrigatório.'),
  subject: z.string().trim().max(200).optional(),
}).strict();

export const listReservationQuerySchema = z.object({
  resource_type: z.enum(['room', 'equipment']).optional(),
  facility_area_id: z.coerce.number().int().positive().optional(),
  asset_id: z.coerce.number().int().positive().optional(),
  status: z.enum(['confirmed', 'canceled', 'completed']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = { createReservationSchema, listReservationQuerySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
