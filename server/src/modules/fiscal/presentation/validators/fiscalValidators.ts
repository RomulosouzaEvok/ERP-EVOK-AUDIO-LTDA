import { z } from 'zod';
import { ValidationError } from '../../../../errors';

/** Validação Zod `.strict()` para os endpoints fiscais (NF-e). */

export const cancelNfeSchema = z.object({
  reason: z.string().trim().min(15, 'Justificativa deve ter ao menos 15 caracteres.'),
}).strict();

export const registerIncomingNfeSchema = z.object({
  nfe_key: z.string().trim().min(1, 'Chave de acesso é obrigatória.'),
  invoice_number: z.string().trim().max(50).optional(),
  nfe_series: z.string().trim().max(10).optional(),
  xml_path: z.string().trim().max(500).optional(),
}).strict();

export const upsertCompanyFiscalConfigSchema = z.object({
  legal_name: z.string().trim().min(1),
  trade_name: z.string().trim().max(200).optional(),
  cnpj: z.string().trim().min(11).max(18),
  ie: z.string().trim().max(20).optional(),
  im: z.string().trim().max(20).optional(),
  crt: z.enum(['1', '2', '3']),
  cnae: z.string().trim().max(10).optional(),
  cep: z.string().trim().max(10).optional(),
  street: z.string().trim().max(200).optional(),
  number: z.string().trim().max(20).optional(),
  complement: z.string().trim().max(100).optional(),
  neighborhood: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  city_ibge_code: z.string().trim().max(7).optional(),
  state: z.string().trim().length(2).optional(),
  nfe_series: z.coerce.number().int().positive().optional(),
  nfe_environment: z.enum(['homologacao', 'producao']).optional(),
  nfe_provider: z.enum(['mock', 'focus_nfe', 'enotas']).optional(),
}).strict();

const schemas = { cancelNfeSchema, registerIncomingNfeSchema, upsertCompanyFiscalConfigSchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload invalido.', error.issues);
  }
  throw error;
};
