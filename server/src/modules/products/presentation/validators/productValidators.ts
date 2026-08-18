import { z } from 'zod';
import { ValidationError } from '../../../../errors';

/**
 * Validação Zod `.strict()` para o módulo `products` — alinhando com o
 * mesmo rigor já aplicado em `sales`/`purchases`/`production`/`inventory`
 * (F6). Regras de negócio mais ricas (preço vs custo, unicidade de código,
 * enum de `product_type`/`status`) continuam na entidade/use cases; esta
 * camada só garante a forma do payload antes de chegar lá.
 */

const decimalQuantity = z.coerce.number().nonnegative().refine((value) => {
  const [, decimals = ''] = value.toString().split('.');
  return decimals.length <= 6;
}, { message: 'Valor decimal deve ter no maximo 6 casas.' });

const PRODUCT_TYPES = ['finished', 'semi_finished', 'component', 'raw_material'] as const;
const PRODUCT_STATUSES = ['active', 'inactive'] as const;

/** Parâmetros Thiele-Small, aceitos tanto aninhados (`tsParams`) quanto no formato flat (`ts_params_fs`, etc.). */
const tsParamsSchema = z
  .object({
    fs: z.coerce.number().optional(),
    qms: z.coerce.number().optional(),
    qes: z.coerce.number().optional(),
    qts: z.coerce.number().optional(),
    vas: z.coerce.number().optional(),
    sd: z.coerce.number().optional(),
    xmax: z.coerce.number().optional(),
    re: z.coerce.number().optional(),
    le: z.coerce.number().optional(),
    bl: z.coerce.number().optional(),
    mms: z.coerce.number().optional(),
    cms: z.coerce.number().optional(),
    spl: z.coerce.number().optional(),
  })
  .strict()
  .optional();

const flatTsParamsFields = {
  ts_params_fs: z.coerce.number().optional(),
  ts_params_qms: z.coerce.number().optional(),
  ts_params_qes: z.coerce.number().optional(),
  ts_params_qts: z.coerce.number().optional(),
  ts_params_vas: z.coerce.number().optional(),
  ts_params_sd: z.coerce.number().optional(),
  ts_params_xmax: z.coerce.number().optional(),
  ts_params_re: z.coerce.number().optional(),
  ts_params_le: z.coerce.number().optional(),
  ts_params_bl: z.coerce.number().optional(),
  ts_params_mms: z.coerce.number().optional(),
  ts_params_cms: z.coerce.number().optional(),
  ts_params_spl: z.coerce.number().optional(),
};

export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório.'),
  code: z.string().trim().min(1, 'Código é obrigatório.'),
  description: z.string().trim().max(2000).optional(),
  category_id: z.coerce.number().int().positive().optional(),
  price: z.coerce.number().positive('Preço deve ser maior que zero.'),
  cost_price: z.coerce.number().nonnegative().optional(),
  quantity: decimalQuantity.optional(),
  min_quantity: decimalQuantity.optional(),
  product_type: z.enum(PRODUCT_TYPES).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  ncm: z.string().trim().max(20).optional(),
  cest: z.string().trim().max(20).nullable().optional(),
  weight: z.coerce.number().nonnegative().optional(),
  unit: z.string().trim().max(20).optional(),
  lead_time: z.coerce.number().int().nonnegative().optional(),
  drawing_number: z.string().trim().max(80).nullable().optional(),
  revision: z.string().trim().max(10).optional(),
  location: z.string().trim().max(120).optional(),
  tsParams: tsParamsSchema,
  ...flatTsParamsFields,
}).strict();

export const updateProductSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().max(2000).optional(),
  category_id: z.coerce.number().int().positive().optional(),
  price: z.coerce.number().positive().optional(),
  cost_price: z.coerce.number().nonnegative().optional(),
  min_quantity: decimalQuantity.optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  product_type: z.enum(PRODUCT_TYPES).optional(),
  ncm: z.string().trim().max(20).optional(),
  cest: z.string().trim().max(20).nullable().optional(),
  weight: z.coerce.number().nonnegative().optional(),
  unit: z.string().trim().max(20).optional(),
  lead_time: z.coerce.number().int().nonnegative().optional(),
  drawing_number: z.string().trim().max(80).nullable().optional(),
  revision: z.string().trim().max(10).optional(),
  location: z.string().trim().max(120).optional(),
}).strict();

export const productMovementSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  type: z.enum(['in', 'out']),
  quantity: decimalQuantity.refine((value) => value > 0, { message: 'Quantidade deve ser maior que zero.' }),
  description: z.string().trim().max(500).optional(),
  // FIND-ERP-001 (GRUPO B, superfície-irmã, mesma causa-raiz de
  // `POST /api/inventory/movements`) — Q2 (APR-2026-020 handoff): opcional por
  // enquanto — existe consumidor externo (n8n/bot) fora do client oficial que
  // ainda não envia esta chave. Ausente => mesmo comportamento de antes desta
  // remediação (sem 400, sem proteção de idempotência nesta chamada).
  // Pendência de acompanhamento: tornar obrigatório quando o consumidor
  // externo migrar.
  operation_id: z.string().uuid('operation_id deve ser um UUID valido.').optional(),
}).strict();

const schemas = { createProductSchema, updateProductSchema, productMovementSchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload invalido.', error.issues);
  }
  throw error;
};
