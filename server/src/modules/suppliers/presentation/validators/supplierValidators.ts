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
  // G11 (alçada de compra por origem): fornecedor estrangeiro.
  //
  // `z.boolean()` de propósito, NÃO `z.coerce.boolean()` — a coerção
  // transformaria a string "false" em `true`, marcando fornecedor nacional
  // como importação.
  //
  // **OBRIGATÓRIO desde 2026-08-11** (auditoria). Era opcional, e a coluna
  // tem `DEFAULT false`: cadastrar um fornecedor estrangeiro sem marcar o
  // campo — o caminho de menor esforço, e o único para quem integra pela API
  // — gravava importação como nacional. A partir daí, todo pedido daquele
  // fornecedor resolvia `origin = 'national'` e passava por baixo do teto de
  // R$ 500 mil: a alçada de importação (que exige a diretoria em QUALQUER
  // valor) simplesmente não acontecia, sem erro em lugar nenhum. Declaração
  // silenciosa por omissão não serve para uma dimensão que comanda alçada —
  // quem cadastra tem de dizer o que está cadastrando.
  is_foreign: z.boolean({
    message: 'is_foreign é obrigatório: declare se o fornecedor é estrangeiro (true) ou nacional (false). '
      + 'Este campo comanda a alçada de aprovação — importação exige a diretoria em qualquer valor (G11).',
  }),
}).strict();

/**
 * Na EDIÇÃO todos os campos seguem opcionais, inclusive `is_foreign` — não
 * se exige redeclarar a origem para trocar um telefone. A proteção do lado da
 * edição é outra e já existe: `UpdateSupplierUseCase` recusa desmarcar
 * `is_foreign` (escalation-only), então um estrangeiro nunca vira nacional.
 */
export const updateSupplierSchema = createSupplierSchema.partial().strict();

const schemas = { createSupplierSchema, updateSupplierSchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload invalido.', error.issues);
  }
  throw error;
};
