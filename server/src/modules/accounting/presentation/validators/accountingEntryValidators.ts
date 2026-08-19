/**
 * Schemas Zod (strict) para os endpoints de Lançamento Contábil
 * (`/api/accounting/entries`).
 *
 * @module modules/accounting/presentation/validators/accountingEntryValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const entryTypeEnum = z.enum([
  'receipt', 'payment', 'sales', 'purchase', 'payroll', 'depreciation', 'closing', 'adjustment',
]);

const statusEnum = z.enum(['draft', 'posted', 'reversed']);
const dateOnlySchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD.');

const entryItemSchema = z.object({
  account_id: z.coerce.number().int().positive(),
  cost_center_id: z.coerce.number().int().positive().optional(),
  debit: z.coerce.number().min(0).optional(),
  credit: z.coerce.number().min(0).optional(),
  historical: z.string().trim().max(2000).optional(),
}).strict();

export const createEntrySchema = z.object({
  entry_date: dateOnlySchema,
  description: z.string().trim().min(1, 'description é obrigatório.').max(255),
  entry_type: entryTypeEnum,
  items: z.array(entryItemSchema).min(1, 'Informe ao menos um item.'),
}).strict();

export const updateEntrySchema = z.object({
  entry_date: dateOnlySchema.optional(),
  description: z.string().trim().min(1).max(255).optional(),
  entry_type: entryTypeEnum.optional(),
  items: z.array(entryItemSchema).min(1).optional(),
}).strict();

export const listEntryQuerySchema = z.object({
  status: statusEnum.optional(),
  entry_type: entryTypeEnum.optional(),
  date_from: z.string().trim().optional(),
  date_to: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export const trialBalanceQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
}).strict();

module.exports = {
  createEntrySchema,
  updateEntrySchema,
  listEntryQuerySchema,
  trialBalanceQuerySchema,
  handleZodError(error: any) {
    if (error?.issues) {
      throw new ValidationError('Payload inválido.', error.issues);
    }
    throw error;
  },
};
