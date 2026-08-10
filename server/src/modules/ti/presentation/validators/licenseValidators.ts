/**
 * Schemas Zod (strict) para os endpoints de Licença de Software
 * (`/api/ti/licenses`) — valida `license_type`/`billing_cycle` contra os
 * enums reais de `it_software_license_details`
 * (`server/migrations/20260807-000153-create-it-software-license-details-seats.cjs`)
 * antes de chegar ao Sequelize, evitando `invalid input value for enum`
 * (500) e devolvendo `ValidationError` (400).
 *
 * @module modules/ti/presentation/validators/licenseValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const licenseTypeEnum = z.enum(['perpetual', 'subscription', 'free']);
const billingCycleEnum = z.enum(['one_time', 'monthly', 'yearly']);

/** `POST /api/ti/licenses`. */
export const createLicenseSchema = z.object({
  asset_id: z.coerce.number().int().positive('asset_id é obrigatório.'),
  license_type: licenseTypeEnum,
  vendor: z.string().trim().max(150).optional(),
  seats: z.coerce.number().int().positive().optional(),
  license_key: z.string().trim().max(500).optional(),
  cost: z.coerce.number().min(0).optional(),
  billing_cycle: billingCycleEnum.optional(),
  renewal_date: z.string().trim().optional(),
}).strict();

/**
 * `PUT /api/ti/licenses/:assetId` — "Atualiza fornecedor/seats/custo/ciclo"
 * (`docs/business/BLOCO_2_TI_API.md` §3). `license_type` é imutável após a
 * criação por desenho (não consta no payload documentado nem em
 * `UpdateLicenseDetailInput`) — não é reaberto aqui de propósito.
 */
export const updateLicenseSchema = z.object({
  vendor: z.string().trim().max(150).optional(),
  seats: z.coerce.number().int().positive().optional(),
  license_key: z.string().trim().max(500).optional(),
  cost: z.coerce.number().min(0).optional(),
  billing_cycle: billingCycleEnum.optional(),
  renewal_date: z.string().trim().optional(),
}).strict();

const schemas = { createLicenseSchema, updateLicenseSchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
