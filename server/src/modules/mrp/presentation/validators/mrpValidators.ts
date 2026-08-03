import { z } from 'zod';

const legacyUuidLike = z.string().regex(
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  'UUID invalido.',
);

/**
 * Schema para validar quantidades industriais com ate 6 casas decimais.
 * Usa comparacao de string para evitar falsos positivos por arredondamento
 * de ponto flutuante (ex: 0.1 + 0.2 !== 0.3).
 */
const decimalLike = z.coerce.number().positive().refine((value) => {
  const parts = value.toString().split('.');
  if (parts.length > 1 && parts[1].length > 6) {
    return false;
  }
  return true;
}, {
  message: 'Valor decimal deve ter no maximo 6 casas.',
});

/** Schema para gerar plano manual de MRP. */
export const createMrpPlanSchema = z.object({
  demands: z.array(z.object({
    item_id: legacyUuidLike,
    quantidade: decimalLike,
    data_necessidade: z.string().date(),
    origem: z.enum(['PEDIDO_VENDA', 'PREVISAO', 'ORDEM_PRODUCAO', 'MANUAL']),
    origem_id: legacyUuidLike.nullable().optional(),
  }).strict()).min(1),
}).strict();

/** Schema do body de `POST /api/mrp/planned-orders/convert`. */
export const convertPlannedOrdersSchema = z.object({
  planned_order_ids: z.array(legacyUuidLike).min(1).max(100),
  notes: z.string().trim().max(1000).optional(),
}).strict();

module.exports = {
  createMrpPlanSchema,
  convertPlannedOrdersSchema,
};
