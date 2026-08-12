/**
 * Schemas Zod (strict) para os endpoints do módulo Diretoria
 * (`/api/directorate/*`).
 *
 * @module modules/directorate/presentation/validators/directorateValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const yearSchema = z.number().int().min(2000).max(2100);
const strategicStatusEnum = z.enum(['not_started', 'in_progress', 'achieved', 'not_achieved']);
const meetingTypeEnum = z.enum(['directors', 'commercial', 'industrial', 'financial', 'board', 'general']);
const riskCategoryEnum = z.enum(['operational', 'financial', 'market', 'regulatory', 'reputation', 'supply']);
const riskLevelEnum = z.enum(['low', 'medium', 'high', 'critical']);
const riskStatusEnum = z.enum(['active', 'mitigated', 'accepted', 'closed']);

// ---- Organograma ----

export const assignDirectorateManagerSchema = z.object({
  manager_id: z.number().int().positive().nullable(),
}).strict();

// ---- Planejamento Estratégico ----

export const createStrategicPlanningSchema = z.object({
  year: yearSchema,
  objective: z.string().trim().min(1, 'objective é obrigatório.').max(2000),
  directorate_id: z.number().int().positive().nullable().optional(),
  department_id: z.number().int().positive().nullable().optional(),
  kpi: z.string().trim().max(200).nullable().optional(),
  target_value: z.number().nullable().optional(),
  weight: z.number().min(0).max(100).nullable().optional(),
  status: strategicStatusEnum.optional(),
  responsible_id: z.number().int().positive().nullable().optional(),
}).strict();

export const updateStrategicPlanningSchema = z.object({
  year: yearSchema.optional(),
  objective: z.string().trim().min(1).max(2000).optional(),
  directorate_id: z.number().int().positive().nullable().optional(),
  department_id: z.number().int().positive().nullable().optional(),
  kpi: z.string().trim().max(200).nullable().optional(),
  target_value: z.number().nullable().optional(),
  weight: z.number().min(0).max(100).nullable().optional(),
  status: strategicStatusEnum.optional(),
  responsible_id: z.number().int().positive().nullable().optional(),
}).strict();

export const updateStrategicPlanningActualSchema = z.object({
  actual_value: z.number(),
}).strict();

export const listStrategicPlanningQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  directorate_id: z.coerce.number().int().positive().optional(),
  department_id: z.coerce.number().int().positive().optional(),
  status: strategicStatusEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(100),
}).strict();

// ---- Atas de Reunião ----

export const createMeetingMinuteSchema = z.object({
  meeting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'meeting_date deve ser YYYY-MM-DD.'),
  meeting_type: meetingTypeEnum,
  title: z.string().trim().min(1, 'title é obrigatório.').max(200),
  participants: z.string().trim().max(4000).nullable().optional(),
  summary: z.string().trim().max(8000).nullable().optional(),
  decisions: z.array(z.unknown()).optional(),
  action_items: z.array(z.unknown()).optional(),
  file_path: z.string().trim().max(500).nullable().optional(),
}).strict();

export const listMeetingMinuteQuerySchema = z.object({
  meeting_type: meetingTypeEnum.optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(100),
}).strict();

// ---- Riscos Corporativos ----

export const createBusinessRiskSchema = z.object({
  risk_category: riskCategoryEnum,
  description: z.string().trim().min(1, 'description é obrigatório.').max(4000),
  probability: riskLevelEnum,
  impact: riskLevelEnum,
  mitigation_actions: z.string().trim().max(4000).nullable().optional(),
  contingency_plan: z.string().trim().max(4000).nullable().optional(),
  responsible_id: z.number().int().positive().nullable().optional(),
  review_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: riskStatusEnum.optional(),
}).strict();

export const updateBusinessRiskSchema = z.object({
  risk_category: riskCategoryEnum.optional(),
  description: z.string().trim().min(1).max(4000).optional(),
  probability: riskLevelEnum.optional(),
  impact: riskLevelEnum.optional(),
  mitigation_actions: z.string().trim().max(4000).nullable().optional(),
  contingency_plan: z.string().trim().max(4000).nullable().optional(),
  responsible_id: z.number().int().positive().nullable().optional(),
  review_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: riskStatusEnum.optional(),
}).strict();

export const listBusinessRiskQuerySchema = z.object({
  status: riskStatusEnum.optional(),
  risk_category: riskCategoryEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(100),
}).strict();

module.exports = {
  assignDirectorateManagerSchema,
  createStrategicPlanningSchema,
  updateStrategicPlanningSchema,
  updateStrategicPlanningActualSchema,
  listStrategicPlanningQuerySchema,
  createMeetingMinuteSchema,
  listMeetingMinuteQuerySchema,
  createBusinessRiskSchema,
  updateBusinessRiskSchema,
  listBusinessRiskQuerySchema,
  handleZodError(error: any) {
    if (error?.issues) {
      throw new ValidationError('Payload inválido.', error.issues);
    }
    throw error;
  },
};
