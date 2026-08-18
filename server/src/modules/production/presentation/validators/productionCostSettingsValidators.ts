import { z } from 'zod';
import { ValidationError } from '../../../../errors';

/** Validações Zod `.strict()` da configuração de custeio de produção. */

export const upsertProductionCostSettingsSchema = z.object({
  overhead_calculation_basis: z.enum(['material_labor', 'labor_only', 'material_only']),
  overhead_rate_percent: z.coerce.number().min(0).max(1000),
  default_labor_rate_per_hour: z.coerce.number().min(0),
}).strict();

const schemas = { upsertProductionCostSettingsSchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload invalido.', error.issues);
  }
  throw error;
};
