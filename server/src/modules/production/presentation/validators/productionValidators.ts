import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const decimalQuantity = z.coerce.number().positive().refine((value) => {
  const [, decimals = ''] = value.toString().split('.');
  return decimals.length <= 6;
}, { message: 'Quantidade deve ter no maximo 6 casas decimais.' });

const lotConsumptionSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  lot_control_id: z.coerce.number().int().positive(),
  quantity: decimalQuantity,
  notes: z.string().trim().max(1000).optional(),
}).strict();

export const createProductionOrderSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  quantity: decimalQuantity,
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  due_date: z.string().date(),
  sales_order_id: z.coerce.number().int().positive().nullable().optional(),
  responsible_id: z.coerce.number().int().positive().nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
}).strict();

export const updateProductionOrderSchema = z.object({
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  due_date: z.string().date().optional(),
  responsible_id: z.coerce.number().int().positive().nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
}).strict();

export const updateProductionOrderStatusSchema = z.object({
  status: z.enum(['planned', 'released', 'in_progress', 'paused', 'completed', 'canceled']),
  quantity_produced: decimalQuantity.optional(),
  allow_overproduction: z.boolean().optional(),
  lot_consumptions: z.array(lotConsumptionSchema).optional(),
  finished_lot_number: z.string().trim().min(1).max(80).optional(),
  serial_numbers: z.array(z.string().trim().min(1).max(120)).optional(),
}).strict();

const schemas = {
  createProductionOrderSchema,
  updateProductionOrderSchema,
  updateProductionOrderStatusSchema
};

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload invalido.', error.issues);
  }
  throw error;
};
