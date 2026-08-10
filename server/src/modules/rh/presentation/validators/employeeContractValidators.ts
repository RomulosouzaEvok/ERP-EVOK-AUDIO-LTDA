/**
 * Schemas Zod (`.strict()`) do Grupo 3 — Contrato de Experiência
 * (`/api/rh/employee-contracts`, §5 do contrato de API, UC-68, **P0**).
 *
 * @module modules/rh/presentation/validators/employeeContractValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';
import { contractStatusEnum, contractTypeEnum, dateOnly } from './rhEnums';

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
  termination_reason: z.string().trim().max(1000).optional(),
}).strict()
  .refine((data) => data.decision !== 'prorrogar' || Boolean(data.period_2_end_date), {
    message: 'period_2_end_date é obrigatório quando decision="prorrogar".',
    path: ['period_2_end_date'],
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
