/**
 * Schemas Zod (strict) para os endpoints de Material de Divulgação
 * (`/api/marketing/materials`).
 *
 * BLOCO 5 MKT (correção): `approved` REMOVIDO de `create`/`update`
 * (RF-MKT-039 — material sempre nasce `approved=false`, aprovação só via
 * `PATCH /materials/:id/approve`); `stock_item_id` novo (RF-MKT-038, FK
 * opcional a `items.id` do Almoxarifado).
 *
 * @module modules/marketing/presentation/validators/materialValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const materialTypeEnum = z.enum(['catalog', 'flyer', 'banner', 'video', 'manual', 'technical_sheet', 'presentation']);

const uuidField = z.string().trim().uuid('deve ser um UUID válido.');

export const createMaterialSchema = z.object({
  title: z.string().trim().min(1, 'title é obrigatório.').max(200),
  material_type: materialTypeEnum,
  product_id: uuidField.optional(),
  stock_item_id: uuidField.optional(),
  version: z.string().trim().max(10).optional(),
}).strict();

export const updateMaterialSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  material_type: materialTypeEnum.optional(),
  product_id: uuidField.nullable().optional(),
  stock_item_id: uuidField.nullable().optional(),
  version: z.string().trim().max(10).optional(),
}).strict();

export const listMaterialQuerySchema = z.object({
  material_type: materialTypeEnum.optional(),
  product_id: uuidField.optional(),
  stock_item_id: uuidField.optional(),
  approved: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = { createMaterialSchema, updateMaterialSchema, listMaterialQuerySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
