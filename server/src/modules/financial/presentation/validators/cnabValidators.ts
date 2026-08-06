import { z } from 'zod';
import { ValidationError } from '../../../../errors';

/** Validação Zod `.strict()` da Cobrança CNAB 240 v1 (remessa/retorno). */

export const upsertBankingConfigSchema = z.object({
  bank_code: z.string().trim().min(1).max(3),
  bank_name: z.string().trim().min(1).max(30),
  agency: z.string().trim().min(1).max(5),
  agency_dv: z.string().trim().max(1).optional().nullable(),
  account_number: z.string().trim().min(1).max(12),
  account_dv: z.string().trim().max(1).optional().nullable(),
  agency_account_dv: z.string().trim().max(1).optional().nullable(),
  covenant_code: z.string().trim().min(1).max(20),
  wallet_code: z.string().trim().min(1).max(1),
  company_document: z.string().trim().min(11).max(14),
  company_legal_name: z.string().trim().min(1).max(30),
}).strict();

export const generateRemittanceSchema = z.object({
  receivable_ids: z.array(z.coerce.number().int().positive()).min(1, 'Selecione ao menos uma conta a receber.'),
}).strict();

export const listRemittancesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
}).strict();

const schemas = {
  upsertBankingConfigSchema, generateRemittanceSchema, listRemittancesQuerySchema,
};

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload invalido.', error.issues);
  }
  throw error;
};
