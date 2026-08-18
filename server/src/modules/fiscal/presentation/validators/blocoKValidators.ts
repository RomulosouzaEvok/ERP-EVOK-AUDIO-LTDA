import { z } from 'zod';
import { ValidationError } from '../../../../errors';

const dateStringSchema = z
  .string()
  .trim()
  .min(1, 'Data obrigatoria.')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Data invalida.');

export const blocoKPreviewQuerySchema = z.object({
  start_date: dateStringSchema,
  end_date: dateStringSchema,
  format: z.enum(['json', 'csv']).optional().default('json'),
}).strict();

module.exports = {
  blocoKPreviewQuerySchema,
  handleZodError: (error: any) => {
    if (error?.issues) {
      throw new ValidationError('Payload invalido.', error.issues);
    }
    throw error;
  },
};
