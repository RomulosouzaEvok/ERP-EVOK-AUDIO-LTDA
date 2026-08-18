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
  invoice_type: z.enum(['nfe', 'nfse']).optional(),
  notes: z.string().trim().max(2000).optional(),
  cost_center_id: z.coerce.number().int().positive().optional(),
}).strict();

/**
 * `POST /api/finance/receivable` — cobrança **avulsa**, sem venda
 * vinculada (decisão D-J: reembolso, aluguel, venda de sucata).
 *
 * `sale_id` e `status` são aceitos pelo schema **de propósito**, mesmo
 * sendo sempre recusados: assim a recusa vem do use case, com
 * `details.rule` (`G13-AR` / `G13-AR-PAID`) e uma mensagem que explica o
 * caminho correto, em vez de um erro genérico de campo desconhecido do
 * `.strict()`.
 */
export const createReceivableSchema = z.object({
  customer_id: z.coerce.number().int().positive('Cliente (customer_id) é obrigatório.'),
  amount: z.coerce.number().positive('Valor deve ser maior que zero.'),
  due_date: z.string().min(1, 'Vencimento é obrigatório.'),
  installment: z.coerce.number().int().positive().optional(),
  invoice_number: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(2000).optional(),
  cost_center_id: z.coerce.number().int().positive().optional(),
  sale_id: z.coerce.number().int().positive().optional(),
  status: z.string().trim().max(20).optional(),
}).strict();

export const payAccountSchema = z.object({
  payment_date: z.string().optional(),
  payment_method: z.string().trim().max(50).optional(),
  amount: z.coerce.number().positive().optional(),
  // Q2 (APR-2026-020 handoff): opcional por enquanto — existe consumidor
  // externo (n8n/bot) fora do client oficial que ainda não envia esta chave.
  // Ausente => mesmo comportamento de antes desta remediação (sem 400, sem
  // proteção de idempotência nesta chamada). Pendência de acompanhamento:
  // tornar obrigatório quando o consumidor externo migrar.
  operation_id: z.string().uuid('operation_id deve ser um UUID valido.').optional(),
}).strict();

export const cashFlowQuerySchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
}).strict();

export const cashFlowProjectionQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).optional().default(30),
}).strict();

/** `GET /api/finance/cashflow/projection` — horizonte fechado em 30/60/90 dias (série diária). */
export const dailyCashFlowProjectionQuerySchema = z.object({
  days: z.coerce.number().int().optional().default(30)
    .refine((value) => [30, 60, 90].includes(value), { message: 'Horizonte (days) deve ser 30, 60 ou 90.' }),
  opening_balance: z.coerce.number().optional().default(0),
}).strict();

/** Atribui/remove (`null`) o centro de custo de uma conta a pagar ou a receber já existente. */
export const updateCostCenterAssignmentSchema = z.object({
  cost_center_id: z.coerce.number().int().positive().nullable(),
}).strict();

const schemas = {
  createPayableSchema, createReceivableSchema, payAccountSchema, cashFlowQuerySchema, cashFlowProjectionQuerySchema,
  dailyCashFlowProjectionQuerySchema, updateCostCenterAssignmentSchema,
};

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload invalido.', error.issues);
  }
  throw error;
};
