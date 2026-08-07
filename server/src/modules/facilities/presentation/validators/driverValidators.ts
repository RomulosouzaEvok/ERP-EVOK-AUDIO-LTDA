/**
 * Schemas Zod (strict) para os endpoints de Condutor
 * (`/api/facilities/drivers`).
 *
 * @module modules/facilities/presentation/validators/driverValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

export const createDriverSchema = z.object({
  employee_id: z.coerce.number().int().positive('employee_id é obrigatório.'),
  cnh_number: z.string().trim().min(1, 'cnh_number é obrigatório.').max(20),
  cnh_category: z.string().trim().min(1, 'cnh_category é obrigatório.').max(5),
  cnh_valid_until: z.string().trim().min(1, 'cnh_valid_until é obrigatório.'),
  cnh_file_path: z.string().trim().max(500).optional(),
}).strict();

export const updateDriverSchema = z.object({
  cnh_number: z.string().trim().max(20).optional(),
  cnh_category: z.string().trim().max(5).optional(),
  cnh_valid_until: z.string().trim().optional(),
  cnh_file_path: z.string().trim().max(500).optional(),
}).strict();

export const suspendDriverSchema = z.object({
  suspension_reason: z.string().trim().min(1, 'suspension_reason é obrigatório.'),
}).strict();

export const listDriverQuerySchema = z.object({
  authorized: z.coerce.boolean().optional(),
  cnh_expiring: z.coerce.boolean().optional(),
  employee_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = { createDriverSchema, updateDriverSchema, suspendDriverSchema, listDriverQuerySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
