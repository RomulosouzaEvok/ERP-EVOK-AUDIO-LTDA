import { z } from 'zod';
import { ValidationError } from '../../../../errors';

/** Validação Zod `.strict()` para o módulo `suppliers`. */

export const createSupplierSchema = z.object({
  company_name: z.string().trim().min(1, 'Razão social é obrigatória.'),
  trade_name: z.string().trim().max(200).optional(),
  cnpj: z.string().trim().min(1, 'CNPJ é obrigatório.'),
  ie: z.string().trim().max(20).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().email('E-mail inválido.').optional().or(z.literal('')),
  address: z.string().trim().max(255).optional(),
  contact_name: z.string().trim().max(200).optional(),
  contact_phone: z.string().trim().max(20).optional(),
  payment_terms: z.string().trim().max(120).optional(),
  delivery_time: z.coerce.number().int().nonnegative().optional(),
  notes: z.string().trim().max(2000).optional(),
}).strict();

export const updateSupplierSchema = createSupplierSchema.partial().strict();

const schemas = { createSupplierSchema, updateSupplierSchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload invalido.', error.issues);
  }
  throw error;
};
