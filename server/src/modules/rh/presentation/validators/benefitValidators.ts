/**
 * Schemas Zod (`.strict()`) do Grupo 8 — Benefícios
 * (`/api/rh/benefit-types`, `/api/rh/employee-benefits`, §10 do contrato de API).
 *
 * @module modules/rh/presentation/validators/benefitValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';
import { benefitCategoryEnum, benefitFundingRuleEnum, benefitEnrollmentStatusEnum, competenceMonth } from './rhEnums';

export const createBenefitTypeSchema = z.object({
  name: z.string().trim().min(1).max(150),
  category: benefitCategoryEnum,
  funding_rule: benefitFundingRuleEnum,
  supplier: z.string().trim().max(150).nullable().optional(),
  active: z.boolean().optional(),
}).strict();

export const updateBenefitTypeSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  category: benefitCategoryEnum.optional(),
  funding_rule: benefitFundingRuleEnum.optional(),
  supplier: z.string().trim().max(150).nullable().optional(),
  active: z.boolean().optional(),
}).strict();

export const listBenefitTypeQuerySchema = z.object({
  category: benefitCategoryEnum.optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export const createEmployeeBenefitSchema = z.object({
  employee_id: z.coerce.number().int().positive(),
  benefit_type_id: z.coerce.number().int().positive(),
  discount_value: z.coerce.number().min(0).optional(),
  company_cost_value: z.coerce.number().min(0).optional(),
  dependents: z.any().optional(),
}).strict();

export const listEmployeeBenefitQuerySchema = z.object({
  employee_id: z.coerce.number().int().positive().optional(),
  benefit_type_id: z.coerce.number().int().positive().optional(),
  enrollment_status: benefitEnrollmentStatusEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export const monthlyBenefitReportQuerySchema = z.object({
  competencia: competenceMonth,
}).strict();

const schemas = {
  createBenefitTypeSchema,
  updateBenefitTypeSchema,
  listBenefitTypeQuerySchema,
  createEmployeeBenefitSchema,
  listEmployeeBenefitQuerySchema,
  monthlyBenefitReportQuerySchema,
};

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
