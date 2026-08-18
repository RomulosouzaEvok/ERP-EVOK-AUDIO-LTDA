/**
 * Schemas Zod (`.strict()`) do Grupo 3 — Contrato de Experiência
 * (`/api/rh/employee-contracts`, §5 do contrato de API, UC-68, **P0**).
 *
 * @module modules/rh/presentation/validators/employeeContractValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';
import { contractStatusEnum, contractTypeEnum, dateOnly, noticeModalityEnum } from './rhEnums';

/** `PATCH /employee-contracts/:id/extend` — RF-RH-015 (Art. 451, CLT). */
export const extendContractSchema = z.object({
  period_2_end_date: dateOnly,
}).strict();

/**
 * `PATCH /employee-contracts/:id/decision` — RF-RH-016 (UC-68).
 *
 * `decision='rescindir'` exige `rh:approve`, checado no router (não aqui) —
 * decisão normativa do dono do produto que mantém `approve` restrito a
 * ações de alto impacto (ver `domain/services/rhSensitiveFields.ts`).
 */
export const decideContractSchema = z.object({
  decision: z.enum(['prorrogar', 'efetivar', 'rescindir']),
  period_2_end_date: dateOnly.optional(),
  termination_reason: z.string().trim().min(1).max(1000).optional(),
  notice_modality: noticeModalityEnum.optional(),
}).strict()
  .superRefine((data, ctx) => {
    if (data.decision === 'prorrogar' && !data.period_2_end_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'period_2_end_date é obrigatório quando decision="prorrogar".',
        path: ['period_2_end_date'],
      });
    }
    if (data.decision === 'rescindir' && !data.termination_reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'termination_reason é obrigatório quando decision="rescindir".',
        path: ['termination_reason'],
      });
    }
    if (data.decision === 'rescindir' && !data.notice_modality) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'notice_modality é obrigatório quando decision="rescindir".',
        path: ['notice_modality'],
      });
    }
  });

export const listContractQuerySchema = z.object({
  employee_id: z.coerce.number().int().positive().optional(),
  status: contractStatusEnum.optional(),
  type: contractTypeEnum.optional(),
  expiring_in_days: z.coerce.number().int().min(0).max(365).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = { extendContractSchema, decideContractSchema, listContractQuerySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
