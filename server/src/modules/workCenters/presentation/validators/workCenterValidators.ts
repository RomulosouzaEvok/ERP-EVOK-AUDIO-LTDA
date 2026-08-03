/**
 * Schemas Zod (strict) para os endpoints de Centro de Trabalho.
 *
 * @module modules/workCenters/presentation/validators/workCenterValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

export const createWorkCenterSchema = z.object({
  code: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).optional(),
  machines_count: z.coerce.number().int().min(1).default(1),
  capacity_hours_per_day: z.coerce.number().gt(0).lte(24).default(8),
  efficiency_factor: z.coerce.number().gt(0).lte(1).default(1),
}).strict();

export const updateWorkCenterSchema = z.object({
  code: z.string().trim().min(1).max(30).optional(),
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(2000).optional(),
  machines_count: z.coerce.number().int().min(1).optional(),
  capacity_hours_per_day: z.coerce.number().gt(0).lte(24).optional(),
  efficiency_factor: z.coerce.number().gt(0).lte(1).optional(),
  active: z.coerce.boolean().optional(),
}).strict();

export const listWorkCenterQuerySchema = z.object({
  active: z.enum(['true', 'false']).optional().transform((value) => (value === undefined ? undefined : value === 'true')),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
}).strict();

/** Validacao de um turno individual ('HH:MM', 24h). */
const timeStringSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horario deve estar no formato HH:MM.');

const shiftSchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  start_time: timeStringSchema,
  end_time: timeStringSchema,
}).strict();

export const replaceWorkCenterShiftsSchema = z.object({
  shifts: z.array(shiftSchema),
}).strict();

export const getWorkCenterLoadQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(60).default(7),
}).strict();

module.exports = {
  createWorkCenterSchema,
  updateWorkCenterSchema,
  listWorkCenterQuerySchema,
  replaceWorkCenterShiftsSchema,
  getWorkCenterLoadQuerySchema,
  handleZodError(error: any) {
    if (error?.issues) {
      throw new ValidationError('Payload invalido.', error.issues);
    }
    throw error;
  },
};
