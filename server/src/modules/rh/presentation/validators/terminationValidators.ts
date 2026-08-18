/**
 * Schemas Zod (`.strict()`) do Grupo 4 — Demissão
 * (`/api/rh/termination-processes`, §6 do contrato de API, UC-70).
 *
 * `payment_deadline` **não é aceito no payload** (§6.1): é coluna GERADA
 * pelo banco (`termination_date + 10`, Art. 477 §6º CLT, migration
 * `20260808-000016`). `.strict()` rejeita a tentativa de enviá-la em vez de
 * ignorá-la em silêncio. `concluded_by`/`s2299_confirmed_by`/`created_by`
 * também não existem aqui — vêm de `req.user.id` (anti-spoofing P0).
 *
 * @module modules/rh/presentation/validators/terminationValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';
import { asoResultEnum, dateOnly, noticeModalityEnum, terminationStatusEnum, terminationTypeEnum } from './rhEnums';

export const createTerminationSchema = z.object({
  employee_id: z.coerce.number().int().positive(),
  termination_type: terminationTypeEnum,
  notice_date: dateOnly,
  notice_modality: noticeModalityEnum,
  termination_reason: z.string().trim().min(1).max(1000),
  termination_date: dateOnly.nullable().optional(),
}).strict();

export const confirmTerminationAsoSchema = z.object({
  aso_result: asoResultEnum,
}).strict();

/** `POST /termination-processes/:id/trct` — anexo do TRCT e/ou marcação de pagamento (RF-RH-018/021). */
export const attachTrctSchema = z.object({
  paid: z.boolean().optional(),
}).strict();

export const terminationEsocialConfirmationSchema = z.object({
  s2299_confirmed: z.literal(true),
}).strict();

export const listTerminationQuerySchema = z.object({
  status: terminationStatusEnum.optional(),
  employee_id: z.coerce.number().int().positive().optional(),
  payment_deadline_at_risk: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = {
  createTerminationSchema,
  confirmTerminationAsoSchema,
  attachTrctSchema,
  terminationEsocialConfirmationSchema,
  listTerminationQuerySchema,
};

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
