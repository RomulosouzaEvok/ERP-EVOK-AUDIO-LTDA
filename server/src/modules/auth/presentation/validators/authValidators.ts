import { z } from 'zod';
import { ValidationError } from '../../../../errors';

/** Schema para `PUT /api/auth/change-password` (troca de senha autenticada). */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual e obrigatoria.'),
  newPassword: z.string().min(6, 'Nova senha deve ter no minimo 6 caracteres.'),
}).strict();

/** Schema para `POST /api/auth/forgot-password` (SEC-12). */
export const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail invalido.'),
}).strict();

/** Schema para `POST /api/auth/reset-password` (SEC-12). */
export const resetPasswordSchema = z.object({
  token: z.string().min(32, 'Token invalido.'),
  newPassword: z.string().min(6, 'Nova senha deve ter no minimo 6 caracteres.'),
}).strict();

const schemas = {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};

module.exports = schemas;
module.exports.handleZodError = (error: any) => {
  if (error?.issues) {
    throw new ValidationError('Payload invalido.', error.issues);
  }
  throw error;
};
