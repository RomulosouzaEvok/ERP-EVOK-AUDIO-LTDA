/**
 * Schemas Zod (`.strict()`) do Grupo 5 — Documentos do Funcionário
 * (`/api/rh/employee-documents`, §7 do contrato de API).
 *
 * 🔒 **RF-RH-028 / LGPD art. 5º II — laudo clínico nunca entra no ERP.**
 * Para `doc_type` iniciado em `aso_`, os únicos campos aceitos são
 * `fitness_result` (aptidão) e `valid_until`. O `.strict()` já rejeita
 * qualquer campo não declarado (ex.: `diagnostico`, `cid`, `laudo`,
 * `observacoes_clinicas`) com `400 VALIDATION_ERROR` — é exatamente o
 * comportamento pedido pelo contrato ("`ValidationError` 400 se o payload
 * trouxer qualquer campo de conteúdo clínico não previsto no schema"), e
 * por isso NÃO existe aqui nenhum campo de texto livre.
 *
 * @module modules/rh/presentation/validators/employeeDocumentValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';
import { asoResultEnum, dateOnly, documentOriginEnum, documentTypeEnum } from './rhEnums';

/**
 * `POST /employee-documents` (multipart — os campos chegam como string em
 * `req.body`, o arquivo em `req.file`, por isso `z.coerce` nos numéricos).
 */
export const createEmployeeDocumentSchema = z.object({
  employee_id: z.coerce.number().int().positive(),
  doc_type: documentTypeEnum,
  valid_until: dateOnly.nullable().optional(),
  fitness_result: asoResultEnum.optional(),
  origin: documentOriginEnum.optional(),
}).strict()
  .refine((data) => !data.doc_type.startsWith('aso_') || Boolean(data.fitness_result), {
    message: 'fitness_result (apto/inapto/apto_com_restricao) é obrigatório para documentos do tipo aso_* (RF-RH-028).',
    path: ['fitness_result'],
  });

export const updateEmployeeDocumentSchema = z.object({
  valid_until: dateOnly.nullable().optional(),
  fitness_result: asoResultEnum.nullable().optional(),
}).strict();

export const listEmployeeDocumentQuerySchema = z.object({
  employee_id: z.coerce.number().int().positive().optional(),
  doc_type: documentTypeEnum.optional(),
  expiring_in_days: z.coerce.number().int().min(0).max(365).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const schemas = { createEmployeeDocumentSchema, updateEmployeeDocumentSchema, listEmployeeDocumentQuerySchema };

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
