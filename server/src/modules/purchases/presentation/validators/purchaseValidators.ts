import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const decimalQuantity = z.coerce.number().positive().refine((value) => {
  const [, decimals = ''] = value.toString().split('.');
  return decimals.length <= 6;
}, { message: 'Valor decimal deve ter no maximo 6 casas.' });

const purchaseItemSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  quantity: decimalQuantity,
  unit_price: z.coerce.number().nonnegative(),
}).strict();

const receivePurchaseItemSchema = z.object({
  item_id: z.coerce.number().int().positive(),
  quantity: decimalQuantity,
  lot_number: z.string().trim().min(1).max(80).optional(),
  received_at: z.coerce.date().optional(),
  manufactured_at: z.coerce.date().optional(),
  expires_at: z.coerce.date().optional(),
  lot_notes: z.string().trim().max(1000).optional(),
}).strict();

export const createPurchaseSchema = z.object({
  supplier_id: z.coerce.number().int().positive(),
  items: z.array(purchaseItemSchema).min(1),
  notes: z.string().trim().max(4000).optional(),
  expected_date: z.string().date().optional(),
}).strict();

export const updatePurchaseSchema = z.object({
  supplier_id: z.coerce.number().int().positive().optional(),
  expected_date: z.string().date().nullable().optional(),
  freight_type: z.enum(['cif', 'fob']).nullable().optional(),
  freight_value: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
}).strict();

export const updatePurchaseStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'sent', 'partial', 'received', 'canceled']),
}).strict();

export const receivePurchaseItemsSchema = z.object({
  items: z.array(receivePurchaseItemSchema).min(1),
  // Numero da NF do fornecedor deste recebimento — chave de deduplicacao
  // (constraint unica purchase_id+invoice_number no banco) para impedir
  // que a mesma NF seja lancada duas vezes contra o mesmo pedido.
  invoice_number: z.string().trim().min(1, 'Numero da NF é obrigatório.').max(50),
}).strict();

const schemas = {
  createPurchaseSchema,
  updatePurchaseSchema,
  updatePurchaseStatusSchema,
  receivePurchaseItemsSchema
};

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload invalido.', error.issues);
  }
  throw error;
};
