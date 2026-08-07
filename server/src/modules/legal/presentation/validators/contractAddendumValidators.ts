/**
 * Schemas Zod (strict) para os endpoints de Aditivo Contratual
 * (`/api/legal/contract-addendums`).
 *
 * @module modules/legal/presentation/validators/contractAddendumValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const changeTypeEnum = z.enum(['term', 'value', 'clause', 'party', 'other']);

export const createAddendumSchema = z.object({
  contract_id: z.coerce.number().int().positive('contract_id é obrigatório.'),
  addendum_number: z.coerce.number().int().positive('addendum_number é obrigatório.'),
  description: z.string().trim().max(5000).optional(),
  change_type: changeTypeEnum,
  new_end_date: z.string().trim().optional(),
  new_value: z.coerce.number().min(0).optional(),
  signed_date: z.string().trim().optional(),
}).strict();

export const updateAddendumSchema = z.object({
  addendum_number: z.coerce.number().int().positive().optional(),
  description: z.string().trim().max(5000).optional(),
  change_type: changeTypeEnum.optional(),
  new_end_date: z.string().trim().nullable().optional(),
  new_value: z.coerce.number().min(0).nullable().optional(),
  signed_date: z.string().trim().nullable().optional(),
}).strict();

export const listAddendumQuerySchema = z.object({
  contract_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = { createAddendumSchema, updateAddendumSchema, listAddendumQuerySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
