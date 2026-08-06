import { z } from 'zod';
import { ValidationError } from '../../../../errors';
import { decimalQuantitySchema } from '../../../../shared/utils/decimal';

const decimalQuantity = decimalQuantitySchema();
/** Aliquota percentual (0-100), ex.: 60 = 60%. */
const rateSchema = z.coerce.number().min(0).max(100).default(0);

const importProcessItemSchema = z.object({
  item_id: z.string().uuid(),
  quantity: decimalQuantity,
  fob_unit_price: z.coerce.number().nonnegative(),
  ii_rate: rateSchema,
  ipi_rate: rateSchema,
  pis_rate: rateSchema,
  cofins_rate: rateSchema,
  icms_rate: rateSchema,
}).strict();

/** Schema do body de `POST /api/comex/import-processes`. */
export const createImportProcessSchema = z.object({
  supplier_id: z.coerce.number().int().positive(),
  fob_currency: z.string().trim().length(3).toUpperCase().default('USD'),
  exchange_rate: z.coerce.number().positive().default(1),
  freight_value: z.coerce.number().nonnegative().default(0),
  insurance_value: z.coerce.number().nonnegative().default(0),
  other_expenses_value: z.coerce.number().nonnegative().default(0),
  notes: z.string().trim().max(4000).optional(),
  items: z.array(importProcessItemSchema).min(1),
}).strict();

/** Schema do body de `GET /api/comex/import-processes` (filtros de listagem). */
export const listImportProcessQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(['draft', 'shipped', 'arrived', 'customs_cleared', 'received', 'cancelled']).optional(),
  supplier_id: z.coerce.number().int().positive().optional(),
}).strict();

/** Schema do body de `POST /api/comex/import-processes/:id/tracking` (acompanhamento). */
export const registerImportTrackingSchema = z.object({
  event: z.enum(['shipped', 'arrived', 'customs_cleared']),
  event_date: z.string().date().optional(),
  exchange_rate: z.coerce.number().positive().optional(),
  freight_value: z.coerce.number().nonnegative().optional(),
  insurance_value: z.coerce.number().nonnegative().optional(),
  other_expenses_value: z.coerce.number().nonnegative().optional(),
  notes: z.string().trim().max(4000).optional(),
}).strict();

/** Schema do body de `POST /api/comex/import-processes/:id/cancel`. */
export const cancelImportProcessSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
}).strict();

module.exports = {
  createImportProcessSchema,
  listImportProcessQuerySchema,
  registerImportTrackingSchema,
  cancelImportProcessSchema,
  handleZodError(error: any) {
    if (error?.issues) {
      throw new ValidationError('Payload invalido.', error.issues);
    }
    throw error;
  },
};
