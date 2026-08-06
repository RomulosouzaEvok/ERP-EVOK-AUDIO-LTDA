import { z } from 'zod';
import { ValidationError } from '../../../../errors';

export const DOWNTIME_REASONS = [
  'setup',
  'manutencao_corretiva',
  'manutencao_preventiva',
  'falta_material',
  'falta_operador',
  'qualidade',
  'outros',
] as const;

export const openProductionDowntimeSchema = z.object({
  work_center_id: z.coerce.number().int().positive(),
  production_order_id: z.coerce.number().int().positive().nullable().optional(),
  reason: z.enum(DOWNTIME_REASONS),
  notes: z.string().trim().max(1000).nullable().optional(),
  started_at: z.string().trim().min(1).max(40).optional(),
}).strict();

export const finishProductionDowntimeSchema = z.object({
  finished_at: z.string().trim().min(1).max(40).optional(),
}).strict();

const schemas = {
  openProductionDowntimeSchema,
  finishProductionDowntimeSchema,
};

module.exports = schemas;
module.exports.DOWNTIME_REASONS = DOWNTIME_REASONS;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload invalido.', error.issues);
  }
  throw error;
};
