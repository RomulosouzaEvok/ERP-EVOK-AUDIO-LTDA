/**
 * Schemas Zod (strict) para os endpoints do módulo Tesouraria
 * (`/api/treasury/*`).
 *
 * @module modules/treasury/presentation/validators/treasuryValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

// ---------------------------------------------------------------------------
// Contas Bancárias
// ---------------------------------------------------------------------------

const bankAccountTypeEnum = z.enum(['corrente', 'poupanca', 'aplicacao']);

export const createBankAccountSchema = z.object({
  bank_name: z.string().trim().min(1, 'bank_name é obrigatório.').max(100),
  agency: z.string().trim().min(1, 'agency é obrigatório.').max(20),
  account_number: z.string().trim().min(1, 'account_number é obrigatório.').max(20),
  account_type: bankAccountTypeEnum,
  current_balance: z.number().finite().optional(),
  manager_name: z.string().trim().max(100).nullable().optional(),
  manager_phone: z.string().trim().max(20).nullable().optional(),
  active: z.boolean().optional(),
}).strict();

export const updateBankAccountSchema = z.object({
  bank_name: z.string().trim().min(1).max(100).optional(),
  agency: z.string().trim().min(1).max(20).optional(),
  account_number: z.string().trim().min(1).max(20).optional(),
  account_type: bankAccountTypeEnum.optional(),
  current_balance: z.number().finite().optional(),
  manager_name: z.string().trim().max(100).nullable().optional(),
  manager_phone: z.string().trim().max(20).nullable().optional(),
  active: z.boolean().optional(),
}).strict();

export const listBankAccountQuerySchema = z.object({
  account_type: bankAccountTypeEnum.optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(100),
}).strict();

// ---------------------------------------------------------------------------
// Operações Financeiras
// ---------------------------------------------------------------------------

const operationTypeEnum = z.enum(['loan', 'investment', 'financing', 'leasing']);
const guaranteeTypeEnum = z.enum(['aval', 'fianca', 'alienacao', 'recebiveis', 'none']);
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD.');

export const createOperationSchema = z.object({
  operation_type: operationTypeEnum,
  institution: z.string().trim().min(1, 'institution é obrigatório.').max(100),
  contract_number: z.string().trim().min(1, 'contract_number é obrigatório.').max(50),
  amount: z.number().positive('amount deve ser maior que zero.'),
  interest_rate: z.number().min(0).max(999.99).nullable().optional(),
  start_date: dateOnlySchema,
  end_date: dateOnlySchema.nullable().optional(),
  guarantee_type: guaranteeTypeEnum.optional(),
  notes: z.string().trim().nullable().optional(),
}).strict();

export const updateOperationSchema = z.object({
  operation_type: operationTypeEnum.optional(),
  institution: z.string().trim().min(1).max(100).optional(),
  contract_number: z.string().trim().min(1).max(50).optional(),
  amount: z.number().positive().optional(),
  interest_rate: z.number().min(0).max(999.99).nullable().optional(),
  start_date: dateOnlySchema.optional(),
  end_date: dateOnlySchema.nullable().optional(),
  guarantee_type: guaranteeTypeEnum.optional(),
  notes: z.string().trim().nullable().optional(),
}).strict();

export const listOperationQuerySchema = z.object({
  status: z.enum(['active', 'settled', 'canceled']).optional(),
  operation_type: operationTypeEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(100),
}).strict();

export const settleOperationSchema = z.object({
  settled_at: dateOnlySchema.optional(),
}).strict();

module.exports = {
  createBankAccountSchema,
  updateBankAccountSchema,
  listBankAccountQuerySchema,
  createOperationSchema,
  updateOperationSchema,
  listOperationQuerySchema,
  settleOperationSchema,
  handleZodError(error: any) {
    if (error?.issues) {
      throw new ValidationError('Payload inválido.', error.issues);
    }
    throw error;
  },
};
