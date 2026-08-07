/**
 * Schemas Zod (strict) para os endpoints de Propriedade Intelectual
 * (`/api/legal/intellectual-property`).
 *
 * @module modules/legal/presentation/validators/intellectualPropertyValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const ipTypeEnum = z.enum(['trademark', 'patent', 'industrial_design', 'copyright', 'trade_secret']);
const statusEnum = z.enum(['filed', 'examined', 'granted', 'expired', 'abandoned']);

export const createIntellectualPropertySchema = z.object({
  ip_type: ipTypeEnum,
  title: z.string().trim().min(1, 'title é obrigatório.').max(200),
  description: z.string().trim().max(5000).optional(),
  registration_number: z.string().trim().max(50).optional(),
  filing_date: z.string().trim().optional(),
  grant_date: z.string().trim().optional(),
  expiration_date: z.string().trim().optional(),
  owner: z.string().trim().max(200).optional(),
  status: statusEnum.optional(),
  jurisdiction: z.string().trim().max(50).optional(),
}).strict();

export const updateIntellectualPropertySchema = z.object({
  ip_type: ipTypeEnum.optional(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  registration_number: z.string().trim().max(50).optional(),
  filing_date: z.string().trim().nullable().optional(),
  grant_date: z.string().trim().nullable().optional(),
  expiration_date: z.string().trim().nullable().optional(),
  owner: z.string().trim().max(200).optional(),
  status: statusEnum.optional(),
  jurisdiction: z.string().trim().max(50).optional(),
}).strict();

export const listIntellectualPropertyQuerySchema = z.object({
  ip_type: ipTypeEnum.optional(),
  status: statusEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export const expiringIntellectualPropertyQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(3650).default(30),
}).strict();

const schemas = {
  createIntellectualPropertySchema,
  updateIntellectualPropertySchema,
  listIntellectualPropertyQuerySchema,
  expiringIntellectualPropertyQuerySchema,
};

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
