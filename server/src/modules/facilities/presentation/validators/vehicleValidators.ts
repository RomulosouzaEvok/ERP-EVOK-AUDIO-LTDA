/**
 * Schemas Zod (strict) para os endpoints de Veículo de Frota
 * (`/api/facilities/vehicles`) e Documento de Veículo (D-2 — veículo é
 * extensão 1:1 de `Asset`).
 *
 * @module modules/facilities/presentation/validators/vehicleValidators
 */

import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const fuelTypeEnum = z.enum(['gasoline', 'ethanol', 'diesel', 'flex', 'electric']);
const statusEnum = z.enum(['active', 'in_maintenance', 'decommissioned', 'lost', 'returned_to_supplier']);

export const createVehicleSchema = z.object({
  brand: z.string().trim().min(1, 'brand é obrigatório.').max(50),
  model: z.string().trim().min(1, 'model é obrigatório.').max(50),
  responsible_id: z.coerce.number().int().positive().optional(),
  department_id: z.coerce.number().int().positive().optional(),
  plate: z.string().trim().min(1, 'Placa é obrigatória.').max(10),
  renavam: z.string().trim().max(30).optional(),
  chassi: z.string().trim().max(50).optional(),
  color: z.string().trim().max(30).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  fuel_type: fuelTypeEnum,
  current_km: z.coerce.number().int().min(0).default(0),
  tank_capacity_liters: z.coerce.number().positive().optional(),
  required_cnh_category: z.string().trim().max(5).optional(),
  notes: z.string().trim().max(2000).optional(),
}).strict();

export const updateVehicleSchema = z.object({
  plate: z.string().trim().min(1).max(10).optional(),
  renavam: z.string().trim().max(30).optional(),
  chassi: z.string().trim().max(50).optional(),
  color: z.string().trim().max(30).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  fuel_type: fuelTypeEnum.optional(),
  current_km: z.coerce.number().int().min(0).optional(),
  tank_capacity_liters: z.coerce.number().positive().optional(),
  required_cnh_category: z.string().trim().max(5).optional(),
  notes: z.string().trim().max(2000).optional(),
}).strict();

export const listVehicleQuerySchema = z.object({
  status: statusEnum.optional(),
  fuel_type: fuelTypeEnum.optional(),
  document_expiring: z.coerce.boolean().optional(),
  preventive_due: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const docTypeEnum = z.enum(['crlv_licenciamento', 'seguro', 'ipva', 'outro']);

export const createVehicleDocumentSchema = z.object({
  doc_type: docTypeEnum,
  reference: z.string().trim().max(100).optional(),
  issuer: z.string().trim().max(150).optional(),
  valid_until: z.string().trim().optional(),
  has_expiration: z.boolean().optional(),
  cost: z.coerce.number().min(0).optional(),
  file_path: z.string().trim().max(500).optional(),
}).strict();

export const renewVehicleDocumentSchema = z.object({
  valid_until: z.string().trim().min(1, 'valid_until é obrigatório.'),
  reference: z.string().trim().max(100).optional(),
  cost: z.coerce.number().min(0).optional(),
  file_path: z.string().trim().max(500).optional(),
}).strict();

export const releaseVehicleDocumentSchema = z.object({
  release_reason: z.string().trim().min(1, 'release_reason é obrigatório.'),
}).strict();

const schemas = {
  createVehicleSchema,
  updateVehicleSchema,
  listVehicleQuerySchema,
  createVehicleDocumentSchema,
  renewVehicleDocumentSchema,
  releaseVehicleDocumentSchema,
};

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload inválido.', error.issues);
  }
  throw error;
};
