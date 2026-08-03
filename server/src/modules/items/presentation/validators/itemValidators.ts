import { z } from 'zod';
import { ValidationError } from '../../../../errors';
import { decimalQuantitySchema } from '../../../../shared/utils/decimal';

const decimalLike = decimalQuantitySchema();

/** Schema para criar item industrial. */
export const createItemSchema = z.object({
  codigo: z.string().trim().min(1).max(80),
  descricao: z.string().trim().min(1).max(240),
  tipo: z.enum(['MATERIA_PRIMA', 'SUBCONJUNTO', 'PRODUTO_ACABADO']),
  unidade: z.string().trim().min(1).max(12),
  status: z.enum(['ATIVO', 'INATIVO', 'BLOQUEADO']).optional(),
  estoque_atual: z.coerce.number().min(0).optional(),
  estoque_reservado: z.coerce.number().min(0).optional(),
  estoque_seguranca: z.coerce.number().min(0).optional(),
  lote_minimo: z.coerce.number().min(0).optional(),
  lead_time_dias: z.coerce.number().int().min(0).optional(),
  custo_padrao: z.coerce.number().min(0).optional(),
  fornecedor_padrao_id: z.string().uuid().nullable().optional(),
}).strict();

/** Schema para criar ligacao de estrutura. */
export const createItemStructureSchema = z.object({
  item_pai_id: z.string().uuid(),
  item_componente_id: z.string().uuid(),
  quantidade: decimalLike,
  perda_percentual: z.coerce.number().min(0).max(100).optional(),
  nivel: z.coerce.number().int().min(1).optional(),
  sequencia: z.coerce.number().int().min(0).optional(),
  ativo: z.boolean().optional(),
  revisao: z.string().trim().min(1).max(20).optional(),
  observacoes: z.string().trim().max(5000).nullable().optional(),
  criado_por: z.any().optional(),
}).strict();

/** Query para listagem de itens. */
export const listItemsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(120).optional(),
  tipo: z.enum(['MATERIA_PRIMA', 'SUBCONJUNTO', 'PRODUTO_ACABADO']).optional(),
  status: z.enum(['ATIVO', 'INATIVO', 'BLOQUEADO']).optional(),
});

/** Query para explosao da estrutura. */
export const explodeItemStructureQuerySchema = z.object({
  quantity: decimalLike,
  due_date: z.string().date().optional(),
});

/** Schema para criar vinculo item x fornecedor (catalogo N:N). */
export const createItemSupplierSchema = z.object({
  supplier_id: z.coerce.number().int().positive(),
  unit_price: z.coerce.number().min(0).optional(),
  currency: z.string().trim().length(3).optional(),
  lead_time_days: z.coerce.number().int().min(0).optional(),
  moq: z.coerce.number().min(0).optional(),
  supplier_item_code: z.string().trim().max(80).optional(),
  preferred: z.boolean().optional(),
  notes: z.string().trim().max(1000).optional(),
}).strict();

/** Schema para atualizar vinculo item x fornecedor (catalogo N:N). */
export const updateItemSupplierSchema = z.object({
  unit_price: z.coerce.number().min(0).optional(),
  currency: z.string().trim().length(3).optional(),
  lead_time_days: z.coerce.number().int().min(0).optional(),
  moq: z.coerce.number().min(0).optional(),
  supplier_item_code: z.string().trim().max(80).optional(),
  preferred: z.boolean().optional(),
  notes: z.string().trim().max(1000).optional(),
}).strict();

const schemas = {
  createItemSchema,
  createItemStructureSchema,
  listItemsQuerySchema,
  explodeItemStructureQuerySchema,
  createItemSupplierSchema,
  updateItemSupplierSchema,
};

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload invalido.', error.issues);
  }
  throw error;
};
