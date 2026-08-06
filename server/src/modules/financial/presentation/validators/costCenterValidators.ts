import { z } from 'zod';
import { ValidationError } from '../../../../errors';

/** Validação Zod `.strict()` dos endpoints de Centro de Custo (`/api/finance/cost-centers`). */

export const createCostCenterSchema = z.object({
  code: z.string().trim().min(1, 'Código é obrigatório.').max(30),
  name: z.string().trim().min(1, 'Nome é obrigatório.').max(100),
  description: z.string().trim().max(2000).optional(),
}).strict();

export const updateCostCenterSchema = z.object({
  code: z.string().trim().min(1).max(30).optional(),
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(2000).optional(),
  active: z.coerce.boolean().optional(),
}).strict();

export const listCostCenterQuerySchema = z.object({
  active: z.enum(['true', 'false']).optional().transform((value) => (value === undefined ? undefined : value === 'true')),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

/** `GET /api/finance/cost-centers/report` — período obrigatório (YYYY-MM-DD). */
export const costCenterReportQuerySchema = z.object({
  from: z.string().min(1, 'Data inicial (from) é obrigatória.'),
  to: z.string().min(1, 'Data final (to) é obrigatória.'),
}).strict();

const schemas = {
  createCostCenterSchema,
  updateCostCenterSchema,
  listCostCenterQuerySchema,
  costCenterReportQuerySchema,
};

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
