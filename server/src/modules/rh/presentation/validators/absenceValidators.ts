/**
 * Schemas Zod (`.strict()`) do Grupo 7 — Afastamentos
 * (`/api/rh/absences`, §9 do contrato de API, UC-71).
 *
 * @module modules/rh/presentation/validators/absenceValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';
import { absenceTypeEnum, dateOnly } from './rhEnums';

export const createAbsenceSchema = z.object({
  employee_id: z.coerce.number().int().positive(),
  type: absenceTypeEnum,
  start_date: dateOnly,
  expected_end_date: dateOnly.optional(),
  extended_program: z.boolean().optional(),
  cid: z.string().trim().max(10).nullable().optional(),
  document_id: z.coerce.number().int().positive().optional(),
}).strict();

export const returnFromAbsenceSchema = z.object({
  actual_end_date: dateOnly,
}).strict();

export const confirmAbsenceEsocialSchema = z.object({
  s2230_confirmed: z.boolean().optional(),
}).strict();

export const listAbsenceQuerySchema = z.object({
  employee_id: z.coerce.number().int().positive().optional(),
  type: absenceTypeEnum.optional(),
  open: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = {
  createAbsenceSchema,
  returnFromAbsenceSchema,
  confirmAbsenceEsocialSchema,
  listAbsenceQuerySchema,
};

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
