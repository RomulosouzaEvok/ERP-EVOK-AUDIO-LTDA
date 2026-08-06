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

// 'partially_invoiced' (faturamento parcial, gap 3/3) aceito no shape do
// payload por simetria com 'invoiced' — ambos sao bloqueados por regra de
// negocio (422) dentro de ChangeSaleStatusUseCase, nunca setados aqui.
export const updateSaleStatusSchema = z.object({
  status: z.enum(['quote', 'confirmed', 'partially_invoiced', 'invoiced', 'shipped', 'canceled']),
}).strict();

export const listSalesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  status: z.enum(['quote', 'confirmed', 'partially_invoiced', 'invoiced', 'shipped', 'canceled']).optional(),
  customer_id: z.coerce.number().int().positive().optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
}).strict();

export const getSaleByIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
}).strict();

// Gap 2/3 (alteracao de pedido): PUT /api/sales/:id/items. `sale_item_id`
// omitido = linha nova; informado = atualiza a linha existente daquele id.
const editSaleItemSchema = z.object({
  sale_item_id: z.coerce.number().int().positive().optional(),
  product_id: z.coerce.number().int().positive(),
  quantity: decimalQuantity,
  unit_price: z.coerce.number().positive(),
}).strict();

export const editSaleItemsSchema = z.object({
  items: z.array(editSaleItemSchema).min(1),
}).strict();

export const editSaleItemsParamSchema = z.object({
  id: z.coerce.number().int().positive(),
}).strict();

// Gap 1/3 (tabela de precos por cliente): POST/PUT/DELETE .../prices[/:priceId]
export const customerIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
}).strict();

export const customerPriceIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  priceId: z.coerce.number().int().positive(),
}).strict();

export const listCustomerPricesQuerySchema = z.object({
  product_id: z.coerce.number().int().positive().optional(),
  active_only: z.coerce.boolean().optional(),
}).strict();

const vigenciaDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD.');

export const createCustomerPriceSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  unit_price: z.coerce.number().positive(),
  currency: z.string().trim().length(3).optional().default('BRL'),
  valid_from: vigenciaDate.optional(),
  valid_until: vigenciaDate.optional(),
}).strict();

export const updateCustomerPriceSchema = z.object({
  unit_price: z.coerce.number().positive().optional(),
  currency: z.string().trim().length(3).optional(),
  valid_from: vigenciaDate.nullable().optional(),
  valid_until: vigenciaDate.nullable().optional(),
}).strict();

const schemas = {
  createSaleSchema,
  updateSaleStatusSchema,
  listSalesQuerySchema,
  getSaleByIdParamSchema,
  editSaleItemsSchema,
  editSaleItemsParamSchema,
  customerIdParamSchema,
  customerPriceIdParamSchema,
  listCustomerPricesQuerySchema,
  createCustomerPriceSchema,
  updateCustomerPriceSchema,
};

module.exports = schemas;

module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload invalido.', error.issues);
  }
  throw error;
};
