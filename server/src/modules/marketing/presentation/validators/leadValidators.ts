/**
 * Schemas Zod (strict) para os endpoints de Lead de Marketing
 * (`/api/marketing/leads`).
 *
 * BLOCO 5 MKT (correção): `email`/`phone` cruzado obrigatório (RF-MKT-016),
 * `lead_source` obrigatório (RF-MKT-017), `event_id`↔`lead_source`
 * cruzado (RF-MKT-022), campos de consentimento LGPD opcionais
 * (RF-MKT-035/036). `status`/`converted_to_customer_id` NUNCA aceitos em
 * `PUT` (conversão é endpoint dedicado, RF-MKT-001) — `changeLeadStatusSchema`
 * também não aceita mais `status='converted'` (validado no use case,
 * `leadStatusEnum` deste schema já não inclui `converted`).
 *
 * @module modules/marketing/presentation/validators/leadValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const leadSourceEnum = z.enum(['website', 'instagram', 'facebook', 'google', 'email', 'event', 'indication', 'other']);
const consentChannelEnum = z.enum(['formulario_site', 'whatsapp', 'telefone', 'feira', 'indicacao', 'outro']);
/** Funil deste endpoint — `converted` NÃO consta (RF-MKT-001, use `POST /leads/:id/convert`). */
const changeableLeadStatusEnum = z.enum(['new', 'contacted', 'qualified', 'in_sales_attendance', 'lost']);
const leadStatusFilterEnum = z.enum(['new', 'contacted', 'qualified', 'in_sales_attendance', 'converted', 'lost']);

export const createLeadSchema = z.object({
  campaign_id: z.coerce.number().int().positive().optional(),
  event_id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1, 'name é obrigatório.').max(200),
  email: z.string().trim().email('email inválido.').max(100).optional().or(z.literal('')),
  phone: z.string().trim().max(20).optional(),
  company: z.string().trim().max(200).optional(),
  interest: z.string().trim().max(255).optional(),
  lead_source: leadSourceEnum,
  lead_score: z.coerce.number().int().min(0).optional(),
  consent_given: z.boolean().optional(),
  consent_date: z.string().trim().optional(),
  consent_channel: consentChannelEnum.optional(),
}).strict()
  .refine((data) => Boolean(data.email) || Boolean(data.phone), {
    message: 'É necessário informar email ou phone.',
    path: ['email'],
  })
  .refine((data) => !data.event_id || data.lead_source === 'event', {
    message: "event_id só pode ser informado quando lead_source='event'.",
    path: ['lead_source'],
  });

export const updateLeadSchema = z.object({
  campaign_id: z.coerce.number().int().positive().nullable().optional(),
  event_id: z.coerce.number().int().positive().nullable().optional(),
  name: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().email('email inválido.').max(100).optional().or(z.literal('')),
  phone: z.string().trim().max(20).optional(),
  company: z.string().trim().max(200).optional(),
  interest: z.string().trim().max(255).optional(),
  lead_source: leadSourceEnum.optional(),
  lead_score: z.coerce.number().int().min(0).optional(),
  consent_given: z.boolean().optional(),
  consent_date: z.string().trim().optional(),
  consent_channel: consentChannelEnum.optional(),
}).strict();

export const bulkCreateLeadItemSchema = z.object({
  event_id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1, 'name é obrigatório.').max(200),
  email: z.string().trim().email('email inválido.').max(100).optional().or(z.literal('')),
  phone: z.string().trim().max(20).optional(),
  company: z.string().trim().max(200).optional(),
  interest: z.string().trim().max(255).optional(),
  lead_source: leadSourceEnum.optional(),
  lead_score: z.coerce.number().int().min(0).optional(),
}).strict();

export const bulkCreateLeadsSchema = z.object({
  event_id: z.coerce.number().int().positive().optional(),
  leads: z.array(bulkCreateLeadItemSchema).min(1, 'leads deve ter ao menos 1 item.'),
}).strict();

export const changeLeadStatusSchema = z.object({
  status: changeableLeadStatusEnum,
  sales_owner_user_id: z.coerce.number().int().positive().optional(),
}).strict();

export const handoffLeadSchema = z.object({
  sales_owner_user_id: z.coerce.number().int().positive({ message: 'sales_owner_user_id é obrigatório.' }),
}).strict();

export const convertLeadSchema = z.object({
  client_id: z.coerce.number().int().positive().optional(),
  new_client: z.object({
    name: z.string().trim().min(1, 'name é obrigatório.'),
    cpf_cnpj: z.string().trim().min(1, 'cpf_cnpj é obrigatório.'),
    phone: z.string().trim().optional(),
    email: z.string().trim().email().optional().or(z.literal('')),
    cep: z.string().trim().optional(),
    street: z.string().trim().optional(),
    number: z.string().trim().optional(),
    complement: z.string().trim().optional(),
    neighborhood: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
  }).optional(),
}).strict()
  .refine((data) => Boolean(data.client_id) !== Boolean(data.new_client), {
    message: 'Informe exatamente um de client_id ou new_client.',
    path: ['client_id'],
  });

export const listLeadQuerySchema = z.object({
  status: leadStatusFilterEnum.optional(),
  campaign_id: z.coerce.number().int().positive().optional(),
  event_id: z.coerce.number().int().positive().optional(),
  lead_source: leadSourceEnum.optional(),
  sales_owner_user_id: z.coerce.number().int().positive().optional(),
  sla_breached: z.coerce.boolean().optional(),
  data_issue_flag: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = {
  createLeadSchema, updateLeadSchema, bulkCreateLeadsSchema, changeLeadStatusSchema,
  handoffLeadSchema, convertLeadSchema, listLeadQuerySchema,
};

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
