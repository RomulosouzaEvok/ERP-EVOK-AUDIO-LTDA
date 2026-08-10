/**
 * Schemas Zod (`.strict()`) do Grupo 2 — Admissão (`/api/rh/admission-processes`,
 * §4 do contrato de API, UC-69).
 *
 * Anti-spoofing (P0 do projeto): `created_by`, `esocial_s2200_confirmed_by`
 * e `employee_id` **não existem** em nenhum schema — vêm de `req.user.id`
 * ou da própria transação de conclusão, nunca do body. `.strict()` garante
 * que enviá-los resulte em `400 VALIDATION_ERROR`, não em silêncio.
 *
 * @module modules/rh/presentation/validators/admissionValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';
import {
  admissionStatusEnum, asoResultEnum, contractTypeEnum, dateOnly,
  employeeShiftEnum, employeeWorkRegimeEnum,
} from './rhEnums';

/** Itens de checklist aceitos — espelham as 6 colunas `checklist_*` de `hr_admission_processes` (migration `20260808-000015`). */
export const checklistDocumentEnum = z.enum(['rg', 'cpf', 'ctps_digital', 'pis', 'comprovante_residencia', 'foto']);

export const createAdmissionProcessSchema = z.object({
  candidate_id: z.coerce.number().int().positive().nullable().optional(),
  job_vacancy_id: z.coerce.number().int().positive().nullable().optional(),
  candidate_name: z.string().trim().min(1, 'candidate_name é obrigatório.').max(200),
  candidate_cpf: z.string().trim().max(14).nullable().optional(),
  department_id: z.coerce.number().int().positive(),
  job_position_id: z.coerce.number().int().positive().nullable().optional(),
  planned_start_date: dateOnly,
  required_documents: z.array(checklistDocumentEnum).optional(),
}).strict();

export const updateChecklistSchema = z.object({
  document: checklistDocumentEnum,
  received: z.boolean(),
}).strict();

export const confirmAsoResultSchema = z.object({
  aso_result: asoResultEnum,
  aso_valid_until: dateOnly.nullable().optional(),
}).strict();

/**
 * `POST /admission-processes/:id/conclude` (§4.3, RF-RH-009).
 *
 * `work_regime` usa `employeeWorkRegimeEnum` (`clt|pj|estagiario|aprendiz`),
 * **não** o exemplo `"experiencia"` do contrato de API — ver nota em
 * `rhEnums.ts`. O prazo de experiência é modelado por
 * `contract_type='experiencia'` + `period_1_end_date`.
 */
export const concludeAdmissionSchema = z.object({
  employee: z.object({
    name: z.string().trim().min(1, 'employee.name é obrigatório.').max(200),
    cpf: z.string().trim().min(11, 'employee.cpf é obrigatório.').max(14),
    hire_date: dateOnly,
    salary: z.coerce.number().min(0).optional(),
    work_regime: employeeWorkRegimeEnum.optional(),
    shift: employeeShiftEnum.optional(),
  }).strict(),
  contract_type: contractTypeEnum,
  period_1_end_date: dateOnly.nullable().optional(),
}).strict()
  .refine((data) => data.contract_type !== 'experiencia' || Boolean(data.period_1_end_date), {
    message: 'period_1_end_date é obrigatório quando contract_type="experiencia" (Art. 445, parágrafo único, CLT).',
    path: ['period_1_end_date'],
  });

export const esocialConfirmationSchema = z.object({
  s2200_confirmed: z.literal(true),
}).strict();

export const cancelAdmissionSchema = z.object({
  reason: z.string().trim().min(1, 'reason é obrigatório para cancelar (RF-RH-012).').max(1000),
}).strict();

export const listAdmissionQuerySchema = z.object({
  status: admissionStatusEnum.optional(),
  department_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = {
  createAdmissionProcessSchema,
  updateChecklistSchema,
  confirmAsoResultSchema,
  concludeAdmissionSchema,
  esocialConfirmationSchema,
  cancelAdmissionSchema,
  listAdmissionQuerySchema,
  checklistDocumentEnum,
};

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
