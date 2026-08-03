import { z } from 'zod';
import { ValidationError } from '../../../../errors';

/**
 * Validadores Zod para o módulo de vendas.
 * Aplica rigor de payload validation (.strict()) em todas as rotas críticas.
 *
 * @module modules/sales/presentation/validators
 */

const decimalQuantity = z.coerce.number().positive().refine((value) => {
  const [, decimals = ''] = value.toString().split('.');
  return decimals.length <= 6;
}, { message: 'Valor decimal deve ter no maximo 6 casas.' });

const saleItemSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  quantity: decimalQuantity,
  unit_price: z.coerce.number().positive(),
}).strict();

export const createSaleSchema = z.object({
  customer_id: z.coerce.number().int().positive(),
  items: z.array(saleItemSchema).min(1),
  discount: z.coerce.number().nonnegative().optional().default(0),
  payment_method: z.enum(['cash', 'credit_card', 'debit_card', 'pix', 'boleto', 'check']).optional(),
  installments: z.coerce.number().int().min(1).optional().default(1),
  notes: z.string().trim().max(4000).optional(),
  // F22: cria a venda ja `confirmed` (default, debita estoque e gera
  // parcelas na hora) ou como `quote` (orcamento, sem debito de estoque
  // nem parcelas ate a confirmacao via PUT /api/sales/:id/status).
  // `invoiced`/`canceled` nao sao permitidos aqui - exigem transicao
  // explicita pela maquina de estados.
  status: z.enum(['quote', 'confirmed']).optional().default('confirmed'),
}).strict();

export const updateSaleStatusSchema = z.object({
  status: z.enum(['quote', 'confirmed', 'invoiced', 'shipped', 'canceled']),
}).strict();

export const listSalesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  status: z.enum(['quote', 'confirmed', 'invoiced', 'shipped', 'canceled']).optional(),
  customer_id: z.coerce.number().int().positive().optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
}).strict();

export const getSaleByIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
}).strict();

const schemas = {
  createSaleSchema,
  updateSaleStatusSchema,
  listSalesQuerySchema,
  getSaleByIdParamSchema,
};

module.exports = schemas;

module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload invalido.', error.issues);
  }
  throw error;
};
