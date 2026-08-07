/**
 * Schemas Zod (strict) para os endpoints de Lead de Marketing
 * (`/api/marketing/leads`).
 *
 * @module modules/marketing/presentation/validators/leadValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const leadSourceEnum = z.enum(['website', 'instagram', 'facebook', 'google', 'email', 'event', 'indication', 'other']);
const leadStatusEnum = z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']);

export const createLeadSchema = z.object({
  campaign_id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1, 'name é obrigatório.').max(200),
  email: z.string().trim().email('email inválido.').max(100).optional().or(z.literal('')),
  phone: z.string().trim().max(20).optional(),
  company: z.string().trim().max(200).optional(),
  interest: z.string().trim().max(255).optional(),
  lead_source: leadSourceEnum.optional(),
  lead_score: z.coerce.number().int().min(0).optional(),
}).strict();

export const updateLeadSchema = z.object({
  campaign_id: z.coerce.number().int().positive().nullable().optional(),
  name: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().email('email inválido.').max(100).optional().or(z.literal('')),
  phone: z.string().trim().max(20).optional(),
  company: z.string().trim().max(200).optional(),
  interest: z.string().trim().max(255).optional(),
  lead_source: leadSourceEnum.optional(),
  lead_score: z.coerce.number().int().min(0).optional(),
}).strict();

export const changeLeadStatusSchema = z.object({
  status: leadStatusEnum,
  converted_to_customer_id: z.coerce.number().int().positive().optional(),
}).strict();

export const listLeadQuerySchema = z.object({
  status: leadStatusEnum.optional(),
  campaign_id: z.coerce.number().int().positive().optional(),
  lead_source: leadSourceEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = { createLeadSchema, updateLeadSchema, changeLeadStatusSchema, listLeadQuerySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
