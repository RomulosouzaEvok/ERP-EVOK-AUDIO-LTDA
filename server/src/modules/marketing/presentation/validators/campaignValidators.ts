/**
 * Schemas Zod (strict) para os endpoints de Campanha de Marketing
 * (`/api/marketing/campaigns`).
 *
 * @module modules/marketing/presentation/validators/campaignValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const campaignTypeEnum = z.enum(['ads', 'social', 'email', 'event', 'trade', 'content']);
const campaignStatusEnum = z.enum(['planned', 'active', 'paused', 'completed', 'canceled']);

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1, 'name é obrigatório.').max(200),
  description: z.string().trim().max(5000).optional(),
  campaign_type: campaignTypeEnum,
  start_date: z.string().trim().min(1, 'start_date é obrigatório.'),
  end_date: z.string().trim().optional(),
  budget: z.coerce.number().min(0).optional(),
  actual_cost: z.coerce.number().min(0).optional(),
  target_audience: z.string().trim().max(255).optional(),
  channel: z.string().trim().max(100).optional(),
  roi: z.coerce.number().optional(),
  status: campaignStatusEnum.default('planned'),
}).strict();

export const updateCampaignSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  campaign_type: campaignTypeEnum.optional(),
  start_date: z.string().trim().min(1).optional(),
  end_date: z.string().trim().nullable().optional(),
  budget: z.coerce.number().min(0).optional(),
  actual_cost: z.coerce.number().min(0).optional(),
  target_audience: z.string().trim().max(255).optional(),
  channel: z.string().trim().max(100).optional(),
  leads_generated: z.coerce.number().int().min(0).optional(),
  conversions: z.coerce.number().int().min(0).optional(),
  roi: z.coerce.number().optional(),
  status: campaignStatusEnum.optional(),
}).strict();

export const listCampaignQuerySchema = z.object({
  status: campaignStatusEnum.optional(),
  campaign_type: campaignTypeEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = { createCampaignSchema, updateCampaignSchema, listCampaignQuerySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
