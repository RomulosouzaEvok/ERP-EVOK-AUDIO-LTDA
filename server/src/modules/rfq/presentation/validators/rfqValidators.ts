import { z } from 'zod';
import { ValidationError } from '../../../../errors';
import { decimalQuantitySchema } from '../../../../shared/utils/decimal';

const decimalQuantity = decimalQuantitySchema();

const rfqItemSchema = z.object({
  item_id: z.string().uuid(),
  quantity: decimalQuantity,
  unit: z.string().trim().max(12).optional(),
}).strict();

/**
 * Schema do body de `POST /api/rfqs`. `requisition_id` e `items` sao
 * mutuamente exclusivos (XOR): se `requisition_id` for informado, os itens
 * sao puxados automaticamente da requisicao (nao aceita `items` no body); se
 * ausente, `items` e obrigatorio e nao pode ser vazio.
 */
export const createRfqSchema = z.object({
  requisition_id: z.coerce.number().int().positive().optional(),
  items: z.array(rfqItemSchema).optional(),
  response_deadline: z.string().date().optional(),
  notes: z.string().trim().max(4000).optional(),
}).strict().refine(
  (data) => Boolean(data.requisition_id) !== Boolean(data.items && data.items.length > 0),
  { message: 'Informe requisition_id OU items (nao os dois, nem nenhum).', path: ['items'] },
);

/** Schema do body de `GET /api/rfqs` (filtros de listagem). */
export const listRfqQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(['draft', 'sent', 'quoted', 'awarded', 'cancelled']).optional(),
  requisition_id: z.coerce.number().int().positive().optional(),
}).strict();

/** Schema do body de `POST /api/rfqs/:id/suppliers` (convite de fornecedores). */
export const inviteRfqSuppliersSchema = z.object({
  supplier_ids: z.array(z.coerce.number().int().positive()).min(1),
}).strict();

const rfqQuoteItemSchema = z.object({
  rfq_item_id: z.coerce.number().int().positive(),
  unit_price: z.coerce.number().positive(),
  lead_time_days: z.coerce.number().int().nonnegative().optional(),
  moq: z.coerce.number().positive().optional(),
  validity_date: z.string().date().optional(),
  notes: z.string().trim().max(1000).optional(),
}).strict();

/** Schema do body de `POST /api/rfqs/:id/quotes` (resposta de um fornecedor). */
export const registerRfqQuoteSchema = z.object({
  supplier_id: z.coerce.number().int().positive(),
  items: z.array(rfqQuoteItemSchema).min(1),
}).strict();

const awardEntrySchema = z.object({
  rfq_item_id: z.coerce.number().int().positive(),
  supplier_id: z.coerce.number().int().positive(),
}).strict();

/** Schema do body de `POST /api/rfqs/:id/award` (adjudicacao, podendo dividir itens entre fornecedores). */
export const awardRfqSchema = z.object({
  awards: z.array(awardEntrySchema).min(1),
  notes: z.string().trim().max(1000).optional(),
}).strict();

module.exports = {
  createRfqSchema,
  listRfqQuerySchema,
  inviteRfqSuppliersSchema,
  registerRfqQuoteSchema,
  awardRfqSchema,
  handleZodError(error: any) {
    if (error?.issues) {
      throw new ValidationError('Payload invalido.', error.issues);
    }
    throw error;
  },
};
