/**
 * Schemas Zod (strict) para os endpoints do módulo Controladoria
 * (`/api/budget/*`).
 *
 * @module modules/budget/presentation/validators/budgetValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const categoryEnum = z.enum(['custo_fixo', 'custo_variavel', 'investimento', 'outro']);
const yearSchema = z.number().int().min(2000).max(2100);
const monthSchema = z.number().int().min(1).max(12);

export const createBudgetLineSchema = z.object({
  cost_center_id: z.number().int().positive('cost_center_id é obrigatório.'),
  year: yearSchema,
  month: monthSchema.nullable().optional(),
  category: categoryEnum.optional(),
  planned_amount: z.number().nonnegative('planned_amount não pode ser negativo.'),
  notes: z.string().trim().max(2000).nullable().optional(),
}).strict();

export const updateBudgetLineSchema = z.object({
  cost_center_id: z.number().int().positive().optional(),
  year: yearSchema.optional(),
  month: monthSchema.nullable().optional(),
  category: categoryEnum.optional(),
  planned_amount: z.number().nonnegative().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
}).strict();

export const listBudgetLineQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  cost_center_id: z.coerce.number().int().positive().optional(),
  category: categoryEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(100),
}).strict();

/** `GET /api/budget/report` — `year` obrigatório; `month`/`cost_center_id` opcionais. */
export const budgetReportQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12).optional(),
  cost_center_id: z.coerce.number().int().positive().optional(),
}).strict();

module.exports = {
  createBudgetLineSchema,
  updateBudgetLineSchema,
  listBudgetLineQuerySchema,
  budgetReportQuerySchema,
  handleZodError(error: any) {
    if (error?.issues) {
      throw new ValidationError('Payload inválido.', error.issues);
    }
    throw error;
  },
};
