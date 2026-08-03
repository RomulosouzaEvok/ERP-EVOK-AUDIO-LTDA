/**
 * Schemas Zod (strict) para os endpoints do modulo de Engenharia (Projetos
 * P&D, Desenhos Tecnicos e Ficha Tecnica Thiele-Small).
 *
 * @module modules/engineering/presentation/validators/engineeringValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

// ---------------------------------------------------------------------
// Projetos de Engenharia (P&D)
// ---------------------------------------------------------------------

const PROJECT_TYPE = ['new_product', 'improvement', 'customization', 'research'] as const;
const PROJECT_STAGE = ['concept', 'design', 'prototype', 'testing', 'homologation', 'production'] as const;
const PROJECT_STATUS = ['active', 'paused', 'completed', 'canceled'] as const;
const PROJECT_PRIORITY = ['low', 'normal', 'high', 'critical'] as const;

export const createProjectSchema = z.object({
  project_code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional(),
  project_type: z.enum(PROJECT_TYPE).optional(),
  product_id: z.coerce.number().int().positive().optional(),
  project_manager_id: z.coerce.number().int().positive().optional(),
  start_date: z.string().trim().min(1).optional(),
  target_date: z.string().trim().min(1).optional(),
  budget: z.coerce.number().min(0).optional(),
  priority: z.enum(PROJECT_PRIORITY).optional(),
  notes: z.string().trim().max(4000).optional(),
}).strict();

export const updateProjectSchema = z.object({
  project_code: z.string().trim().min(1).max(20).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(4000).optional(),
  project_type: z.enum(PROJECT_TYPE).optional(),
  product_id: z.coerce.number().int().positive().nullable().optional(),
  project_manager_id: z.coerce.number().int().positive().nullable().optional(),
  start_date: z.string().trim().min(1).nullable().optional(),
  target_date: z.string().trim().min(1).nullable().optional(),
  completion_date: z.string().trim().min(1).nullable().optional(),
  budget: z.coerce.number().min(0).nullable().optional(),
  actual_cost: z.coerce.number().min(0).optional(),
  stage: z.enum(PROJECT_STAGE).optional(),
  status: z.enum(PROJECT_STATUS).optional(),
  priority: z.enum(PROJECT_PRIORITY).optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
}).strict();

export const listProjectsQuerySchema = z.object({
  status: z.enum(PROJECT_STATUS).optional(),
  stage: z.enum(PROJECT_STAGE).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

// ---------------------------------------------------------------------
// Desenhos Tecnicos
// ---------------------------------------------------------------------

const DRAWING_TYPE = ['assembly', 'detail', 'exploded', 'schematic', 'bom'] as const;
const DRAWING_STATUS = ['draft', 'released', 'obsolete', 'canceled'] as const;

export const createDrawingSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  drawing_number: z.string().trim().min(1).max(50),
  revision: z.string().trim().min(1).max(10).optional(),
  title: z.string().trim().min(1).max(200),
  drawing_type: z.enum(DRAWING_TYPE).optional(),
  file_path: z.string().trim().max(255).optional(),
  material_spec: z.string().trim().max(4000).optional(),
  dimensions: z.string().trim().max(4000).optional(),
  tolerances: z.string().trim().max(4000).optional(),
  notes: z.string().trim().max(4000).optional(),
}).strict();

export const updateDrawingSchema = z.object({
  drawing_number: z.string().trim().min(1).max(50).optional(),
  revision: z.string().trim().min(1).max(10).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  drawing_type: z.enum(DRAWING_TYPE).optional(),
  file_path: z.string().trim().max(255).nullable().optional(),
  material_spec: z.string().trim().max(4000).nullable().optional(),
  dimensions: z.string().trim().max(4000).nullable().optional(),
  tolerances: z.string().trim().max(4000).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
}).strict();

export const listDrawingsQuerySchema = z.object({
  product_id: z.coerce.number().int().positive().optional(),
  status: z.enum(DRAWING_STATUS).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

// ---------------------------------------------------------------------
// Ficha Tecnica Thiele-Small (ItemEspecificacaoTecnica)
// ---------------------------------------------------------------------

/**
 * Os 13 parametros Thiele-Small (todos opcionais e numericos) usados na
 * ficha tecnica de alto-falantes. Persistidos dentro do JSONB `atributos`
 * de {@link ItemEspecificacaoTecnica}.
 */
const thieleSmallParamsSchema = z.object({
  fs_hz: z.coerce.number().optional(),
  qms: z.coerce.number().optional(),
  qes: z.coerce.number().optional(),
  qts: z.coerce.number().optional(),
  vas_l: z.coerce.number().optional(),
  sd_cm2: z.coerce.number().optional(),
  xmax_mm: z.coerce.number().optional(),
  re_ohms: z.coerce.number().optional(),
  le_mh: z.coerce.number().optional(),
  bl_tm: z.coerce.number().optional(),
  mms_g: z.coerce.number().optional(),
  cms_mm_n: z.coerce.number().optional(),
  spl_db: z.coerce.number().optional(),
}).catchall(z.union([z.number(), z.string(), z.boolean(), z.null()]));

export const upsertTechnicalSpecSchema = z.object({
  familia_tecnica: z.string().trim().min(1).max(40).optional(),
  atributos: thieleSmallParamsSchema,
}).strict();

module.exports = {
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuerySchema,
  createDrawingSchema,
  updateDrawingSchema,
  listDrawingsQuerySchema,
  upsertTechnicalSpecSchema,
  handleZodError(error: any) {
    if (error?.issues) {
      throw new ValidationError('Payload invalido.', error.issues);
    }
    throw error;
  },
};
