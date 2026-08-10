/**
 * Schemas Zod (`.strict()`) do Grupo 6 — Férias
 * (`/api/rh/vacation-accrual-periods`, `/api/rh/vacation-schedules`, §8 do
 * contrato de API, UC-67, **P0 — maior risco legal do bloco**).
 *
 * `VacationAccrualPeriod` **nunca nasce por `POST` manual** (§8.1,
 * RF-RH-031) — por isso não existe schema de criação de período aquisitivo
 * aqui: a abertura é automática, dentro da transação de conclusão da
 * admissão (`ConcludeAdmissionProcessUseCase` →
 * `OpenVacationAccrualPeriodUseCase`).
 *
 * Nomes de payload × coluna (achado 9 da auditoria cruzada — mapeamento
 * explícito, nunca 1:1 automático): `aviso_em` → `notice_sent_at`;
 * `override_team_limit_justification` → `fractioning_justification`;
 * `reason` (revisão) → `revision_reason`.
 *
 * @module modules/rh/presentation/validators/vacationValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';
import { accrualStatusEnum, dateOnly } from './rhEnums';

export const listAccrualPeriodQuerySchema = z.object({
  employee_id: z.coerce.number().int().positive().optional(),
  status: accrualStatusEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

/**
 * `POST /vacation-accrual-periods/:id/recalculate` — RF-RH-032 (Art. 130,
 * CLT). `unexcused_absences` é opcional e só existe enquanto
 * `HrTimeSheetSummary` (Grupo 10, P1) não estiver implementado: sem ele o
 * use case assume 0 faltas e devolve `data_gap_detected: true`.
 */
export const recalculateAccrualPeriodSchema = z.object({
  unexcused_absences: z.coerce.number().int().min(0).max(366).optional(),
}).strict();

/** Campos comuns a criar e revisar uma fração de férias (RF-RH-035/036/037/039). */
const vacationScheduleFields = {
  start_date: dateOnly,
  days: z.coerce.number().int().positive().max(30),
  abono: z.boolean().optional(),
  abono_days: z.coerce.number().int().positive().max(10).optional(),
  abono_requested_at: dateOnly.optional(),
  aviso_em: dateOnly.optional(),
  employee_agreement_confirmed: z.boolean().optional(),
  override_team_limit_justification: z.string().trim().max(1000).nullable().optional(),
};

export const createVacationScheduleSchema = z.object({
  accrual_period_id: z.coerce.number().int().positive(),
  ...vacationScheduleFields,
}).strict()
  .refine((data) => !data.abono || Boolean(data.abono_days), {
    message: 'abono_days é obrigatório quando abono=true (Art. 143, caput, CLT — limite de 1/3).',
    path: ['abono_days'],
  });

/** `POST /vacation-schedules/:id/revise` — RF-RH-040 (novo registro, nunca `UPDATE` destrutivo). */
export const reviseVacationScheduleSchema = z.object({
  reason: z.string().trim().min(1, 'reason é obrigatório para revisar uma programação (RF-RH-040).').max(1000),
  ...vacationScheduleFields,
}).strict()
  .refine((data) => !data.abono || Boolean(data.abono_days), {
    message: 'abono_days é obrigatório quando abono=true (Art. 143, caput, CLT — limite de 1/3).',
    path: ['abono_days'],
  });

export const confirmVacationTakenSchema = z.object({
  days_taken: z.coerce.number().int().positive().max(30).optional(),
}).strict();

export const listVacationScheduleQuerySchema = z.object({
  employee_id: z.coerce.number().int().positive().optional(),
  accrual_period_id: z.coerce.number().int().positive().optional(),
  department_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export const vacationCalendarQuerySchema = z.object({
  department_id: z.coerce.number().int().positive().optional(),
  from: dateOnly,
  to: dateOnly,
}).strict();

const schemas = {
  listAccrualPeriodQuerySchema,
  recalculateAccrualPeriodSchema,
  createVacationScheduleSchema,
  reviseVacationScheduleSchema,
  confirmVacationTakenSchema,
  listVacationScheduleQuerySchema,
  vacationCalendarQuerySchema,
};

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
