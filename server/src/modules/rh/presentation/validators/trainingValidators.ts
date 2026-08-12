/**
 * Schemas Zod (`.strict()`) do Grupo 9 — Treinamentos
 * (`/api/rh/training-courses`, `/api/rh/employee-trainings`, §11 do contrato de API).
 *
 * @module modules/rh/presentation/validators/trainingValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';
import { dateOnly } from './rhEnums';

export const createTrainingCourseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  is_normative: z.boolean().optional(),
  nr_code: z.string().trim().max(20).nullable().optional(),
  validity_months: z.coerce.number().int().positive().nullable().optional(),
  workload_hours: z.coerce.number().min(0).nullable().optional(),
  active: z.boolean().optional(),
}).strict();

export const updateTrainingCourseSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  is_normative: z.boolean().optional(),
  nr_code: z.string().trim().max(20).nullable().optional(),
  validity_months: z.coerce.number().int().positive().nullable().optional(),
  workload_hours: z.coerce.number().min(0).nullable().optional(),
  active: z.boolean().optional(),
}).strict();

export const listTrainingCourseQuerySchema = z.object({
  is_normative: z.coerce.boolean().optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export const createEmployeeTrainingSchema = z.object({
  employee_id: z.coerce.number().int().positive(),
  training_course_id: z.coerce.number().int().positive(),
  completed_at: dateOnly,
  instructor_or_provider: z.string().trim().max(200).nullable().optional(),
  certificate_file_path: z.string().trim().max(255).nullable().optional(),
}).strict();

export const listEmployeeTrainingQuerySchema = z.object({
  employee_id: z.coerce.number().int().positive().optional(),
  training_course_id: z.coerce.number().int().positive().optional(),
  expiring_in_days: z.coerce.number().int().min(0).optional(),
  department_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export const cannotOperateReportQuerySchema = z.object({
  department_id: z.coerce.number().int().positive().optional(),
}).strict();

const schemas = {
  createTrainingCourseSchema,
  updateTrainingCourseSchema,
  listTrainingCourseQuerySchema,
  createEmployeeTrainingSchema,
  listEmployeeTrainingQuerySchema,
  cannotOperateReportQuerySchema,
};

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
