/**
 * Schemas Zod para validacao das rotas de rastreabilidade.
 *
 * @module modules/traceability/presentation/validators/traceabilityValidators
 */

import { z } from 'zod';

/** Valida parametro UUID para consulta de rastreabilidade. */
export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

const schemas = {
  uuidParamSchema,
};

module.exports = schemas;

