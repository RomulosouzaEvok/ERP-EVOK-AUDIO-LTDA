/**
 * Schemas Zod para validacao das rotas de rastreabilidade.
 *
 * @module modules/traceability/presentation/validators/traceabilityValidators
 */

import { z } from 'zod';

/** Valida parametro numerico positivo para consulta de rastreabilidade. */
export const traceabilityIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const schemas = {
  traceabilityIdParamSchema,
};

module.exports = schemas;

