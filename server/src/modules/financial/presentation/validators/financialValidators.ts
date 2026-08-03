import { z } from 'zod';
import { ValidationError } from '../../../../errors';

/** Validação Zod `.strict()` para o módulo `financial`. */

export const createPayableSchema = z.object({
  description: z.string().trim().min(1, 'Descrição é obrigatória.'),
  amount: z.coerce.number().positive('Valor deve ser maior que zero.'),
  due_date: z.string().min(1, 'Vencimento é obrigatório.'),
  category: z.string().trim().max(80).optional(),
  supplier_id: z.coerce.number().int().positive().optional(),
  purchase_id: z.coerce.number().int().positive().optional(),
  notes: z.string().trim().max(2000).optional(),
}).strict();

export const payAccountSchema = z.object({
  payment_date: z.string().optional(),
  payment_method: z.string().trim().max(50).optional(),
  amount: z.coerce.number().positive().optional(),
}).strict();

export const cashFlowQuerySchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
}).strict();

export const cashFlowProjectionQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).optional().default(30),
}).strict();

const schemas = { createPayableSchema, payAccountSchema, cashFlowQuerySchema, cashFlowProjectionQuerySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload invalido.', error.issues);
  }
  throw error;
};
