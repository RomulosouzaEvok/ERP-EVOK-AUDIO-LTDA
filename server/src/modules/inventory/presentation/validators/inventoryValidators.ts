import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const decimalQuantity = z.coerce.number().positive().refine((value) => {
  const [, decimals = ''] = value.toString().split('.');
  return decimals.length <= 6;
}, { message: 'Quantidade deve ter no maximo 6 casas decimais.' });

export const createInventoryMovementSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  type: z.enum(['in', 'out']),
  quantity: decimalQuantity,
  description: z.string().trim().min(1).max(1000),
  reference_id: z.coerce.number().int().positive().nullable().optional(),
  reference_type: z.enum(['sale', 'purchase', 'production', 'adjustment', 'transfer']).nullable().optional(),
}).strict();

const schemas = {
  createInventoryMovementSchema
};

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload invalido.', error.issues);
  }
  throw error;
};
