import { z } from 'zod';
import { ValidationError } from '../../../../errors';

/** Validação Zod `.strict()` para o módulo `clients` (alinhando ao rigor já aplicado em sales/purchases/production/inventory). */

export const createClientSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório.'),
  cpf_cnpj: z.string().trim().min(1, 'CPF/CNPJ é obrigatório.'),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().email('E-mail inválido.').optional().or(z.literal('')),
  address: z.string().trim().max(255).optional(),
  notes: z.string().trim().max(2000).optional(),
  tax_regime: z.string().trim().max(50).optional(),
  ie: z.string().trim().max(20).optional(),
  im: z.string().trim().max(20).optional(),
  // CNAE (decisão D-I do dono, 2026-08-10: "sim, mas opcional"). NUNCA trava a
  // criação — pessoa física não tem CNAE. O `.max(10)` não é preciosismo: a
  // coluna é `varchar(10)` e um valor maior seria rejeitado pelo Postgres com
  // 500 em vez de 422. Nenhuma regex de formato é imposta de propósito: o dono
  // decidiu disponibilizar o campo, não normalizá-lo.
  cnae: z.string().trim().max(10).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(2).optional(),
  cep: z.string().trim().max(10).optional(),
  street: z.string().trim().max(255).optional(),
  number: z.string().trim().max(20).optional(),
  complement: z.string().trim().max(120).optional(),
  neighborhood: z.string().trim().max(120).optional(),
}).strict();

export const updateClientSchema = createClientSchema.partial().strict();

const schemas = { createClientSchema, updateClientSchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload invalido.', error.issues);
  }
  throw error;
};
