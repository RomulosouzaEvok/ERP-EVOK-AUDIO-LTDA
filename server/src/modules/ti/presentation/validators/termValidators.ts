/**
 * Schemas Zod (strict) para os endpoints de Termo de Responsabilidade de
 * Equipamento (`/api/ti/responsibility-terms`) — valida `acceptance_type`/
 * `condition_on_return` contra os enums reais de
 * `it_responsibility_terms`
 * (`server/migrations/20260807-000152-create-it-responsibility-terms.cjs`)
 * antes de chegar ao Sequelize, evitando `invalid input value for enum`
 * (500) e devolvendo `ValidationError` (400).
 *
 * @module modules/ti/presentation/validators/termValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const acceptanceTypeEnum = z.enum(['physical_signature', 'digital_ack']);
const conditionOnReturnEnum = z.enum(['ok', 'damaged', 'incomplete']);

/** `POST /api/ti/responsibility-terms`. */
export const createTermSchema = z.object({
  asset_id: z.coerce.number().int().positive('asset_id é obrigatório.'),
  employee_id: z.coerce.number().int().positive('employee_id é obrigatório.'),
  condition_on_delivery: z.string().trim().max(2000).optional(),
  accessories: z.string().trim().max(2000).optional(),
  acceptance_type: acceptanceTypeEnum,
  signed_document_path: z.string().trim().max(500).nullable().optional(),
}).strict();

/** `POST /api/ti/responsibility-terms/:id/return`. */
export const returnTermSchema = z.object({
  condition_on_return: conditionOnReturnEnum,
  return_notes: z.string().trim().max(2000).optional(),
}).strict();

const schemas = { createTermSchema, returnTermSchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
