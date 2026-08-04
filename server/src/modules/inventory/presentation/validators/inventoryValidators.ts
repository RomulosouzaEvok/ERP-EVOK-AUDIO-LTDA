import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const decimalQuantity = z.coerce.number().positive().refine((value) => {
  const [, decimals = ''] = value.toString().split('.');
  return decimals.length <= 6;
}, { message: 'Quantidade deve ter no maximo 6 casas decimais.' });

export const createInventoryMovementSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  type: z.enum(['in', 'out']),
  quantity: decimalQuantity,
  description: z.string().trim().min(1).max(1000),
  reference_id: z.coerce.number().int().positive().nullable().optional(),
  reference_type: z.enum(['sale', 'purchase', 'production', 'adjustment', 'transfer']).nullable().optional(),
  // Deposito onde a movimentacao manual ocorre (Bloco 4, UC-42). Opcional —
  // default 'INSUMOS' quando ausente.
  warehouse_code: z.string().trim().min(1).max(30).optional(),
}).strict();

export const createWarehouseTransferSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  from_warehouse_code: z.string().trim().min(1).max(30),
  to_warehouse_code: z.string().trim().min(1).max(30),
  quantity: decimalQuantity,
  reason: z.string().trim().min(1, 'Motivo é obrigatório.').max(1000),
}).strict();

export const rejectWarehouseTransferSchema = z.object({
  reason: z.string().trim().min(1, 'Motivo da rejeição é obrigatório.').max(1000),
}).strict();

// CRUD de Depositos (docs/governance/TODO.md, Bloco 4.2/4.3).
export const createWarehouseSchema = z.object({
  code: z.string().trim().min(1, 'code é obrigatório.').max(30),
  name: z.string().trim().min(1, 'name é obrigatório.').max(100),
  description: z.string().trim().max(2000).nullable().optional(),
  active: z.boolean().optional(),
}).strict();

// `code` NUNCA é editável — é a chave usada por
// `WarehouseStockService.getWarehouseByCode` em todo o sistema.
export const updateWarehouseSchema = z.object({
  name: z.string().trim().min(1, 'name não pode ser vazio.').max(100).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  active: z.boolean().optional(),
}).strict();

// Valida `:id` de rota (ex.: `PUT /api/inventory/warehouses/:id`) — garante
// inteiro positivo antes de chegar ao use case/Sequelize, evitando que um id
// não numérico propague um erro imprevisível do driver em vez do 400/404
// esperado.
export const idParamSchema = z.coerce.number().int().positive();

// Criação de contagem de inventário cíclico (Bloco 4, migration
// `20260804-000006`, docs/DATABASE.md). `warehouse_id` é OBRIGATÓRIO — a
// contagem inteira (cabeçalho + todos os `inventory_count_items`) é
// escopada a um único depósito por vez. Aceita `product_ids` (legado) OU
// `item_ids` (novo, dual-read, ver `CreateInventoryCountUseCase`).
export const createInventoryCountSchema = z.object({
  count_type: z.enum(['cycle', 'full', 'spot']).optional(),
  warehouse_id: z.coerce.number().int().positive({ message: 'Depósito (warehouse_id) é obrigatório para criar uma contagem de inventário.' }),
  location: z.string().trim().max(100).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  product_ids: z.array(z.coerce.number().int().positive()).optional(),
  item_ids: z.array(z.string().trim().min(1)).optional(),
}).strict();

const schemas = {
  createInventoryMovementSchema,
  createWarehouseTransferSchema,
  rejectWarehouseTransferSchema,
  createWarehouseSchema,
  updateWarehouseSchema,
  idParamSchema,
  createInventoryCountSchema
};

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload invalido.', error.issues);
  }
  throw error;
};
