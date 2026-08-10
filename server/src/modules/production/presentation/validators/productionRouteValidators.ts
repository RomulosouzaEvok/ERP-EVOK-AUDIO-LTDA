/**
 * Schemas Zod (strict) dos endpoints de Roteiro de Producao (gap G5).
 *
 * Limites de tamanho copiados das colunas reais
 * (`server/src/models/ProductionRoute.ts`, `ProductionRouteStep.ts`) para que
 * o erro chegue como 400 de validacao e nao como 500 do Postgres.
 *
 * NOTA anti-spoofing (P0): `created_by`/`approved_by` NAO existem em nenhum
 * destes schemas de proposito — eles vem sempre de `req.user.id` (JWT).
 *
 * @module modules/production/presentation/validators/productionRouteValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';
import { PRODUCTION_ROUTE_STATUSES } from '../../domain/productionRouteRules';

/** Etapa do roteiro (`production_route_steps`). */
export const productionRouteStepSchema = z.object({
  sequence: z.coerce.number().int().positive(),
  step_code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(120),
  work_center: z.string().trim().max(100).nullish(),
  work_center_id: z.coerce.number().int().positive().nullish(),
  standard_time_minutes: z.coerce.number().min(0).max(99999999).default(0),
  setup_time_minutes: z.coerce.number().min(0).max(99999999).default(0),
  instructions: z.string().trim().max(5000).nullish(),
  quality_check_required: z.coerce.boolean().default(false),
  is_active: z.coerce.boolean().default(true),
}).strict();

export const createProductionRouteSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  route_code: z.string().trim().min(1).max(50),
  revision: z.string().trim().min(1).max(10).optional(),
  description: z.string().trim().max(5000).nullish(),
  steps: z.array(productionRouteStepSchema).max(200).optional(),
}).strict();

export const updateProductionRouteSchema = z.object({
  route_code: z.string().trim().min(1).max(50).optional(),
  revision: z.string().trim().min(1).max(10).optional(),
  description: z.string().trim().max(5000).nullish(),
}).strict();

export const replaceProductionRouteStepsSchema = z.object({
  steps: z.array(productionRouteStepSchema).max(200),
}).strict();

export const reviseProductionRouteSchema = z.object({
  revision: z.string().trim().min(1).max(10).optional(),
  route_code: z.string().trim().min(1).max(50).optional(),
  description: z.string().trim().max(5000).nullish(),
}).strict();

export const listProductionRouteQuerySchema = z.object({
  product_id: z.coerce.number().int().positive().optional(),
  status: z.enum(PRODUCTION_ROUTE_STATUSES).optional(),
  route_code: z.string().trim().max(50).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
}).strict();

/**
 * Converte um `ZodError` no `ValidationError` (400) padrao do projeto.
 *
 * @param error - Erro lancado/retornado pelo Zod.
 * @throws {ValidationError} Sempre que `error.issues` existir; caso contrario repassa o erro original.
 */
export function handleZodError(error: any): never {
  if (error?.issues) {
    throw new ValidationError('Payload invalido.', error.issues);
  }
  throw error;
}

module.exports = {
  productionRouteStepSchema,
  createProductionRouteSchema,
  updateProductionRouteSchema,
  replaceProductionRouteStepsSchema,
  reviseProductionRouteSchema,
  listProductionRouteQuerySchema,
  handleZodError,
};
