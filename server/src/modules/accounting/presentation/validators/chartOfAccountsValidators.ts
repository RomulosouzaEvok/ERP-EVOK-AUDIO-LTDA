/**
 * Schemas Zod (strict) para os endpoints do Plano de Contas
 * (`/api/accounting/accounts`).
 *
 * @module modules/accounting/presentation/validators/chartOfAccountsValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const accountTypeEnum = z.enum(['asset', 'liability', 'equity', 'revenue', 'expense', 'cost']);

/** Código do plano de contas: segmentos numéricos separados por ponto (ex.: "1", "1.1", "1.1.1"). */
const accountCodeSchema = z.string().trim().min(1, 'code é obrigatório.').max(20)
  .regex(/^\d+(\.\d+)*$/, 'code deve seguir o formato "1", "1.1", "1.1.1" (segmentos numéricos separados por ponto).');

export const createAccountSchema = z.object({
  code: accountCodeSchema,
  name: z.string().trim().min(1, 'name é obrigatório.').max(200),
  account_type: accountTypeEnum,
  accept_entries: z.boolean().optional(),
  active: z.boolean().optional(),
}).strict();

export const updateAccountSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  account_type: accountTypeEnum.optional(),
  accept_entries: z.boolean().optional(),
  active: z.boolean().optional(),
}).strict();

export const listAccountQuerySchema = z.object({
  account_type: accountTypeEnum.optional(),
  active: z.coerce.boolean().optional(),
  parent_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(100),
}).strict();

module.exports = {
  createAccountSchema,
  updateAccountSchema,
  listAccountQuerySchema,
  handleZodError(error: any) {
    if (error?.issues) {
      throw new ValidationError('Payload inválido.', error.issues);
    }
    throw error;
  },
};
