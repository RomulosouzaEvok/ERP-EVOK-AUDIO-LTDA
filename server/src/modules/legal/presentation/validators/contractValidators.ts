/**
 * Schemas Zod (strict) para os endpoints de Contrato
 * (`/api/legal/contracts`).
 *
 * @module modules/legal/presentation/validators/contractValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const contractTypeEnum = z.enum([
  'clt_indeterminado', 'clt_determinado', 'experiencia', 'estagio', 'aprendiz',
  'distribuicao', 'representacao_comercial', 'fornecimento', 'prestacao_servicos',
  'confidencialidade', 'licenciamento_marca', 'outro',
]);

const statusEnum = z.enum(['draft', 'signed', 'active', 'expired', 'terminated']);

export const createContractSchema = z.object({
  contract_number: z.string().trim().min(1, 'contract_number é obrigatório.').max(50),
  contract_type: contractTypeEnum,
  title: z.string().trim().min(1, 'title é obrigatório.').max(200),
  party_a: z.string().trim().min(1, 'party_a é obrigatório.').max(200),
  party_b: z.string().trim().min(1, 'party_b é obrigatório.').max(200),
  subject: z.string().trim().max(5000).optional(),
  value: z.coerce.number().min(0).optional(),
  start_date: z.string().trim().min(1, 'start_date é obrigatório.'),
  end_date: z.string().trim().optional(),
  auto_renewal: z.boolean().optional(),
  notice_period_days: z.coerce.number().int().min(0).optional(),
  status: statusEnum.optional(),
}).strict();

export const updateContractSchema = z.object({
  contract_number: z.string().trim().min(1).max(50).optional(),
  contract_type: contractTypeEnum.optional(),
  title: z.string().trim().min(1).max(200).optional(),
  party_a: z.string().trim().min(1).max(200).optional(),
  party_b: z.string().trim().min(1).max(200).optional(),
  subject: z.string().trim().max(5000).optional(),
  value: z.coerce.number().min(0).nullable().optional(),
  start_date: z.string().trim().min(1).optional(),
  end_date: z.string().trim().nullable().optional(),
  auto_renewal: z.boolean().optional(),
  notice_period_days: z.coerce.number().int().min(0).nullable().optional(),
  status: statusEnum.optional(),
}).strict();

export const listContractQuerySchema = z.object({
  status: statusEnum.optional(),
  contract_type: contractTypeEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export const expiringContractQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(3650).default(30),
}).strict();

const schemas = { createContractSchema, updateContractSchema, listContractQuerySchema, expiringContractQuerySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
