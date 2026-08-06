import { z } from 'zod';
import { ValidationError } from '../../../../errors';

/** Validação Zod `.strict()` da Conciliação Bancária v1 (importação OFX). */

export const listStatementsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
}).strict();

export const listStatementEntriesQuerySchema = z.object({
  status: z.enum(['pending', 'matched', 'ignored']).optional(),
}).strict();

/** `POST /entries/:id/match` — XOR obrigatório entre `payable_id` e `receivable_id`. */
export const matchEntrySchema = z.object({
  payable_id: z.coerce.number().int().positive().optional(),
  receivable_id: z.coerce.number().int().positive().optional(),
}).strict().refine(
  (data) => Boolean(data.payable_id) !== Boolean(data.receivable_id),
  { message: 'Informe exatamente um de payable_id ou receivable_id.' },
);

const schemas = { listStatementsQuerySchema, listStatementEntriesQuerySchema, matchEntrySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload invalido.', error.issues);
  }
  throw error;
};
