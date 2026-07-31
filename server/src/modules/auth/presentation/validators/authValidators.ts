import { z } from 'zod';
import { ValidationError } from '../../../../errors';

/** Schema para `PUT /api/auth/change-password` (troca de senha autenticada). */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual e obrigatoria.'),
  newPassword: z.string().min(6, 'Nova senha deve ter no minimo 6 caracteres.'),
}).strict();

const schemas = {
  changePasswordSchema,
};

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload invalido.', error.issues);
  }
  throw error;
};
