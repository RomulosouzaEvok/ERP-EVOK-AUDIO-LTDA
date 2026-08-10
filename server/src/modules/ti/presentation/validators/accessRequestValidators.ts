/**
 * Schema Zod (strict) para o endpoint de criação de Solicitação de Acesso
 * (`/api/ti/access-requests`) — valida `type` contra o enum real de
 * `it_access_requests`
 * (`server/migrations/20260807-000154-create-it-access-requests.cjs`) antes
 * de chegar ao Sequelize, evitando `invalid input value for enum` (500) e
 * devolvendo `ValidationError` (400).
 *
 * @module modules/ti/presentation/validators/accessRequestValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const accessRequestTypeEnum = z.enum(['grant', 'change', 'revoke']);

/** `POST /api/ti/access-requests`. */
export const createAccessRequestSchema = z.object({
  type: accessRequestTypeEnum,
  employee_id: z.coerce.number().int().positive('employee_id é obrigatório.'),
  department_id: z.coerce.number().int().positive().optional(),
  requested_profile_id: z.coerce.number().int().positive().optional(),
  justification: z.string().trim().max(2000).optional(),
  corporate_email: z.string().trim().max(150).optional(),
  equipment_needed: z.unknown().optional(),
  checklist: z.record(z.string(), z.boolean()).optional(),
}).strict();

const schemas = { createAccessRequestSchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
