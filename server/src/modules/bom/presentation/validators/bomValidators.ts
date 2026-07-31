import { z } from 'zod';
import { ValidationError } from '../../../../errors';

/** Validação Zod `.strict()` para o módulo `bom` (Estrutura de Produto). */

const bomItemSchema = z.object({
  component_product_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().positive(),
  unit: z.string().trim().max(20).optional(),
  bom_level: z.coerce.number().int().positive().optional(),
  sequence_order: z.coerce.number().int().nonnegative().optional(),
  component_type: z.enum(['raw_material', 'component', 'semi_finished', 'packaging', 'consumable', 'other']).optional(),
  scrap_percentage: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
  alternative_product_id: z.coerce.number().int().positive().nullable().optional(),
  is_critical: z.boolean().optional(),
}).strict();

export const createBomSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  items: z.array(bomItemSchema).min(1, 'Adicione ao menos um componente.'),
  revision: z.string().trim().max(10).optional(),
  revision_notes: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(2000).optional(),
}).strict();

export const updateBomSchema = z.object({
  revision: z.string().trim().max(10).optional(),
  revision_notes: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(2000).optional(),
  status: z.enum(['draft', 'active', 'inactive', 'superseded']).optional(),
}).strict();

const schemas = { createBomSchema, updateBomSchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload invalido.', error.issues);
  }
  throw error;
};
