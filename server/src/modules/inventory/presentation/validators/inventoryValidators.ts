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
  // Deposito onde a movimentacao manual ocorre (Bloco 4, UC-42). Opcional —
  // default 'INSUMOS' quando ausente.
  warehouse_code: z.string().trim().min(1).max(30).optional(),
}).strict();

export const createWarehouseTransferSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  from_warehouse_code: z.string().trim().min(1).max(30),
  to_warehouse_code: z.string().trim().min(1).max(30),
  quantity: decimalQuantity,
  reason: z.string().trim().min(1, 'Motivo é obrigatório.').max(1000),
}).strict();

export const rejectWarehouseTransferSchema = z.object({
  reason: z.string().trim().min(1, 'Motivo da rejeição é obrigatório.').max(1000),
}).strict();

const schemas = {
  createInventoryMovementSchema,
  createWarehouseTransferSchema,
  rejectWarehouseTransferSchema
};

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload invalido.', error.issues);
  }
  throw error;
};
