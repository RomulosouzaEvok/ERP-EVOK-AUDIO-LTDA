/**
 * Schemas Zod (strict) para os endpoints de Área Física
 * (`/api/facilities/areas`).
 *
 * @module modules/facilities/presentation/validators/areaValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const areaTypeEnum = z.enum(['production', 'warehouse', 'office', 'lab', 'amenities', 'external']);

export const createAreaSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório.').max(100),
  area_type: areaTypeEnum,
  square_meters: z.coerce.number().min(0).optional(),
  department_id: z.coerce.number().int().positive().optional(),
  capacity_persons: z.coerce.number().int().min(0).optional(),
  notes: z.string().trim().max(2000).optional(),
}).strict();

export const updateAreaSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  area_type: areaTypeEnum.optional(),
  square_meters: z.coerce.number().min(0).optional(),
  department_id: z.coerce.number().int().positive().nullable().optional(),
  capacity_persons: z.coerce.number().int().min(0).optional(),
  notes: z.string().trim().max(2000).optional(),
}).strict();

export const listAreaQuerySchema = z.object({
  area_type: areaTypeEnum.optional(),
  department_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = { createAreaSchema, updateAreaSchema, listAreaQuerySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
