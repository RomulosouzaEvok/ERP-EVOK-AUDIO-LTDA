import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const decimalQuantity = z.coerce.number().positive().refine((value) => {
  const [, decimals = ''] = value.toString().split('.');
  return decimals.length <= 6;
}, { message: 'Valor decimal deve ter no maximo 6 casas.' });

const requisitionItemSchema = z.object({
  item_id: z.string().uuid(),
  quantity: decimalQuantity,
  unit: z.string().trim().max(12).optional(),
  required_date: z.string().date().optional(),
  suggested_supplier_id: z.coerce.number().int().positive().optional(),
  unit_price_estimated: z.coerce.number().nonnegative().optional(),
  notes: z.string().trim().max(1000).optional(),
}).strict();

// requester_id sempre vem do JWT (req.user.id) e aprovacao tem fluxo proprio:
// aceitar requester_id/approved_by/approval_date no body permitiria spoofing
// de identidade e requisicao nascendo pre-aprovada (bypass do workflow).
export const createPurchaseRequisitionSchema = z.object({
  department_id: z.coerce.number().int().positive().optional(),
  production_order_id: z.coerce.number().int().positive().optional(),
  request_date: z.string().date().optional(),
  priority: z.enum(['normal', 'urgent', 'emergency']).optional(),
  status: z.enum(['draft', 'pending']).optional(),
  origin: z.string().trim().min(1).max(80).optional(),
  notes: z.string().trim().max(4000).optional(),
  items: z.array(requisitionItemSchema).min(1),
}).strict();

export const listPurchaseRequisitionQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(['draft', 'pending', 'approved', 'ordered', 'partial', 'received', 'canceled']).optional(),
  origin: z.string().trim().optional(),
  requester_id: z.coerce.number().int().positive().optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
}).strict();

module.exports = {
  createPurchaseRequisitionSchema,
  listPurchaseRequisitionQuerySchema,
  handleZodError(error: any) {
    if (error?.issues) {
      throw new ValidationError('Payload invalido.', error.issues);
    }
    throw error;
  },
};

