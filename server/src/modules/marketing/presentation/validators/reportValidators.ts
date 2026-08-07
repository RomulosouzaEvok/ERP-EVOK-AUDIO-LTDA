/**
 * Schemas Zod (strict) para os endpoints de Relatório/KPI de Marketing
 * (`/api/marketing/reports`), NOVO no BLOCO 5 MKT (correção) — RF-MKT-026
 * a 029, UC-66.
 *
 * @module modules/marketing/presentation/validators/reportValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const leadSourceEnum = z.enum(['website', 'instagram', 'facebook', 'google', 'email', 'event', 'indication', 'other']);
const eventTypeEnum = z.enum(['feira', 'lancamento', 'workshop', 'regional']);

export const funnelReportQuerySchema = z.object({
  campaign_id: z.coerce.number().int().positive().optional(),
  lead_source: leadSourceEnum.optional(),
  date_from: z.string().trim().optional(),
  date_to: z.string().trim().optional(),
}).strict();

export const eventsReportQuerySchema = z.object({
  event_type: eventTypeEnum.optional(),
  date_from: z.string().trim().optional(),
  date_to: z.string().trim().optional(),
}).strict();

const schemas = { funnelReportQuerySchema, eventsReportQuerySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
