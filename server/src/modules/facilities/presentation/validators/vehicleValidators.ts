/**
 * Schemas Zod (strict) para os endpoints de Veículo de Frota
 * (`/api/facilities/vehicles`).
 *
 * @module modules/facilities/presentation/validators/vehicleValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const fuelTypeEnum = z.enum(['gasoline', 'ethanol', 'diesel', 'flex', 'electric']);
const statusEnum = z.enum(['active', 'maintenance', 'deactivated', 'sold']);

export const createVehicleSchema = z.object({
  plate: z.string().trim().min(1, 'Placa é obrigatória.').max(10),
  brand: z.string().trim().max(50).optional(),
  model: z.string().trim().max(50).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  color: z.string().trim().max(30).optional(),
  fuel_type: fuelTypeEnum.optional(),
  renavam: z.string().trim().max(30).optional(),
  chassi: z.string().trim().max(50).optional(),
  insurance_company: z.string().trim().max(100).optional(),
  insurance_policy: z.string().trim().max(50).optional(),
  insurance_expiry: z.string().trim().optional(),
  last_oil_change: z.string().trim().optional(),
  next_oil_change_km: z.coerce.number().int().min(0).optional(),
  current_km: z.coerce.number().int().min(0).default(0),
  status: statusEnum.default('active'),
  notes: z.string().trim().max(2000).optional(),
}).strict();

export const updateVehicleSchema = z.object({
  plate: z.string().trim().min(1).max(10).optional(),
  brand: z.string().trim().max(50).optional(),
  model: z.string().trim().max(50).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  color: z.string().trim().max(30).optional(),
  fuel_type: fuelTypeEnum.optional(),
  renavam: z.string().trim().max(30).optional(),
  chassi: z.string().trim().max(50).optional(),
  insurance_company: z.string().trim().max(100).optional(),
  insurance_policy: z.string().trim().max(50).optional(),
  insurance_expiry: z.string().trim().optional(),
  last_oil_change: z.string().trim().optional(),
  next_oil_change_km: z.coerce.number().int().min(0).optional(),
  current_km: z.coerce.number().int().min(0).optional(),
  status: statusEnum.optional(),
  notes: z.string().trim().max(2000).optional(),
}).strict();

export const listVehicleQuerySchema = z.object({
  status: statusEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = { createVehicleSchema, updateVehicleSchema, listVehicleQuerySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
