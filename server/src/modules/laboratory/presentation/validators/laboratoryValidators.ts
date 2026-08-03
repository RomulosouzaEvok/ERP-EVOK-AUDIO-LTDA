/**
 * Schemas Zod (strict) para os endpoints do modulo de Laboratorio (testes
 * acusticos / Thiele-Small).
 *
 * @module modules/laboratory/presentation/validators/laboratoryValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const TEST_TYPE = [
  'impedance',
  'frequency_response',
  'thd',
  'power_rms',
  'power_peak',
  'life',
  'polarity',
  'noise',
  'thiele_small',
] as const;

export const createTestSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  serial_number: z.string().trim().min(1).max(50).optional(),
  lot_number: z.string().trim().min(1).max(80).optional(),
  production_order_id: z.coerce.number().int().positive().optional(),
  test_type: z.enum(TEST_TYPE),
  parameters: z.record(z.string(), z.any()).optional(),
  result: z.coerce.number().optional(),
  unit: z.string().trim().min(1).max(20).optional(),
  specification_min: z.coerce.number().optional(),
  specification_max: z.coerce.number().optional(),
  curve_data: z.union([z.record(z.string(), z.any()), z.array(z.any())]).optional(),
  notes: z.string().trim().max(4000).optional(),
  create_rnc_on_fail: z.coerce.boolean().optional(),
}).strict();

export const listTestsQuerySchema = z.object({
  product_id: z.coerce.number().int().positive().optional(),
  test_type: z.enum(TEST_TYPE).optional(),
  passed: z.enum(['true', 'false']).optional().transform((value) => (value === undefined ? undefined : value === 'true')),
  serial_number: z.string().trim().min(1).max(50).optional(),
  start_date: z.string().trim().min(1).optional(),
  end_date: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export const getSummaryQuerySchema = z.object({
  product_id: z.coerce.number().int().positive().optional(),
  days: z.coerce.number().int().positive().max(3650).default(30),
}).strict();

module.exports = {
  createTestSchema,
  listTestsQuerySchema,
  getSummaryQuerySchema,
  handleZodError(error: any) {
    if (error?.issues) {
      throw new ValidationError('Payload invalido.', error.issues);
    }
    throw error;
  },
};
