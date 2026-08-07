/**
 * Schemas Zod (strict) para os endpoints de Manutenção Predial
 * (`/api/facilities/maintenance-tickets`).
 *
 * @module modules/facilities/presentation/validators/maintenanceTicketValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const specialtyEnum = z.enum(['electrical', 'plumbing', 'civil', 'hvac', 'roofing', 'gardening', 'other']);

export const createMaintenanceTicketSchema = z.object({
  facility_area_id: z.coerce.number().int().positive('facility_area_id é obrigatório.'),
  facility_specialty: specialtyEnum,
  asset_id: z.coerce.number().int().positive().nullable().optional(),
  description: z.string().trim().min(1, 'description é obrigatório.'),
}).strict();

export const triageMaintenanceTicketSchema = z.object({
  priority: z.enum(['low', 'normal', 'high', 'emergency']),
  personal_safety_risk: z.boolean().default(false),
}).strict();

export const executeMaintenanceTicketSchema = z.object({
  service_performed: z.string().trim().min(1, 'service_performed é obrigatório.'),
  parts_cost: z.coerce.number().min(0).optional(),
  labor_cost: z.coerce.number().min(0).optional(),
  supplies_consumed: z.array(z.object({ item_id: z.string().min(1), quantity: z.coerce.number().positive(), unit: z.string().optional() })).optional(),
}).strict();

export const generatePreventiveMaintenanceTicketSchema = z.object({
  frequency_days: z.coerce.number().int().positive('frequency_days é obrigatório.'),
}).strict();

export const listMaintenanceTicketQuerySchema = z.object({
  facility_specialty: specialtyEnum.optional(),
  priority: z.enum(['low', 'normal', 'high', 'emergency']).optional(),
  status: z.enum(['open', 'scheduled', 'in_progress', 'waiting_parts', 'completed', 'canceled']).optional(),
  facility_area_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = {
  createMaintenanceTicketSchema,
  triageMaintenanceTicketSchema,
  executeMaintenanceTicketSchema,
  generatePreventiveMaintenanceTicketSchema,
  listMaintenanceTicketQuerySchema,
};

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
