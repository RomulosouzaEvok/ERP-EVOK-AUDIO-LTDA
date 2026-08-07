/**
 * Schemas Zod (strict) para os endpoints de Abastecimento
 * (`/api/facilities/fuel-records`). BREAKING: `vehicle_id` renomeado para
 * `asset_id` (D-2).
 *
 * @module modules/facilities/presentation/validators/fuelRecordValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

export const createFuelRecordSchema = z.object({
  asset_id: z.coerce.number().int().positive('asset_id é obrigatório.'),
  record_date: z.string().trim().min(1).optional(),
  km_at_refuel: z.coerce.number().int().min(0).optional(),
  liters: z.coerce.number().positive('liters deve ser maior que zero.'),
  unit_price: z.coerce.number().positive('unit_price deve ser maior que zero.'),
  total_cost: z.coerce.number().min(0).optional(),
  fuel_station: z.string().trim().max(100).optional(),
  driver_id: z.coerce.number().int().positive().optional(),
  full_tank: z.boolean().default(false),
  invoice_ref: z.string().trim().max(100).optional(),
  trip_id: z.coerce.number().int().positive().nullable().optional(),
}).strict();

export const updateFuelRecordSchema = z.object({
  invoice_ref: z.string().trim().max(100).optional(),
  fuel_station: z.string().trim().max(100).optional(),
  unit_price: z.coerce.number().positive().optional(),
  total_cost: z.coerce.number().min(0).optional(),
  full_tank: z.boolean().optional(),
}).strict();

export const listFuelRecordQuerySchema = z.object({
  asset_id: z.coerce.number().int().positive().optional(),
  full_tank: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = { createFuelRecordSchema, updateFuelRecordSchema, listFuelRecordQuerySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
