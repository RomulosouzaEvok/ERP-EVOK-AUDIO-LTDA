/**
 * Schemas Zod (`.strict()`) do Grupo 10 — Frequência/Ponto
 * (`/api/rh/time-imports`, `/api/rh/attendance`).
 *
 * @module modules/rh/presentation/validators/timeImportValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';
import { dateOnly, competenceMonth, timeImportBatchStatusEnum } from './rhEnums';

export const createTimeImportBatchSchema = z.object({
  competencia_inicio: dateOnly,
  competencia_fim: dateOnly,
}).strict();

export const listTimeImportBatchQuerySchema = z.object({
  status: timeImportBatchStatusEnum.optional(),
  competencia: competenceMonth.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export const monthlyAttendanceSummaryQuerySchema = z.object({
  competencia: competenceMonth,
  employee_id: z.coerce.number().int().positive().optional(),
}).strict();

const schemas = {
  createTimeImportBatchSchema,
  listTimeImportBatchQuerySchema,
  monthlyAttendanceSummaryQuerySchema,
};

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
