/**
 * Schemas Zod (strict) para os endpoints de Campanha de Marketing
 * (`/api/marketing/campaigns`).
 *
 * BLOCO 5 MKT (correção): `budget` → `budget_requested` (RF-MKT-030);
 * `leads_generated`/`conversions`/`roi` REMOVIDOS de `create`/`update`
 * (RF-MKT-006 — `.strict()` rejeita com 400 se enviados, nunca ignora
 * silenciosamente); `notes` novo (único campo aceito quando a campanha
 * está `completed`/`canceled`, RF-MKT-034, regra aplicada no use case).
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
  budget_requested: z.coerce.number().min(0).optional(),
  actual_cost: z.coerce.number().min(0).optional(),
  target_audience: z.string().trim().max(255).optional(),
  channel: z.string().trim().max(100).optional(),
  status: campaignStatusEnum.default('planned'),
}).strict();

export const updateCampaignSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  campaign_type: campaignTypeEnum.optional(),
  start_date: z.string().trim().min(1).optional(),
  end_date: z.string().trim().nullable().optional(),
  budget_requested: z.coerce.number().min(0).optional(),
  actual_cost: z.coerce.number().min(0).optional(),
  target_audience: z.string().trim().max(255).optional(),
  channel: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  status: campaignStatusEnum.optional(),
}).strict();

export const budgetDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  budget_approved: z.coerce.number().min(0).optional(),
  reason: z.string().trim().max(1000).optional(),
}).strict()
  .refine((data) => data.decision !== 'approved' || data.budget_approved !== undefined, {
    message: 'budget_approved é obrigatório quando decision="approved".',
    path: ['budget_approved'],
  });

export const listCampaignQuerySchema = z.object({
  status: campaignStatusEnum.optional(),
  campaign_type: campaignTypeEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = { createCampaignSchema, updateCampaignSchema, budgetDecisionSchema, listCampaignQuerySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
