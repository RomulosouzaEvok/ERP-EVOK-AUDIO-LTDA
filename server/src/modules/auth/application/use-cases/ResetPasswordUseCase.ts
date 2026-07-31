/**
 * Use case: conclusao da recuperacao de senha (SEC-12).
 *
 * Valida o token (por hash) e sua expiracao, define a nova senha (o hook do
 * model `User` cuida do hash bcrypt e do incremento de `password_version`,
 * invalidando sessoes antigas - SEC-10) e limpa o token de uso unico.
 *
 * @module modules/auth/application/use-cases/ResetPasswordUseCase
 */

import crypto from 'crypto';

import UseCase from '../../../../shared/application/UseCase';
import { UnauthorizedError } from '../../../../errors';
import AuthRepository from '../../domain/repositories/AuthRepository';

const { sequelize } = require('../../../../config/database');

interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

interface ResetPasswordOutput {
  id: number;
}

class ResetPasswordUseCase extends UseCase<ResetPasswordInput, ResetPasswordOutput> {
  private readonly authRepository: AuthRepository;

  /**
   * @param authRepository - Repositorio de autenticacao.
   */
  public constructor(authRepository: AuthRepository) {
    super();
    this.authRepository = authRepository;
  }

  /**
   * @param input - Token de recuperacao (texto plano) e nova senha.
   * @returns Id do usuario cuja senha foi redefinida.
   * @throws {UnauthorizedError} Se o token for invalido, ja usado ou expirado.
   */
  public async execute({ token, newPassword }: ResetPasswordInput): Promise<ResetPasswordOutput> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    return sequelize.transaction(async (transaction: unknown) => {
      const user: any = await this.authRepository.findUserByResetTokenHash(tokenHash, transaction);

      if (!user || !user.resetPasswordExpiresAt || user.resetPasswordExpiresAt.getTime() < Date.now()) {
        throw new UnauthorizedError('Token de recuperação inválido ou expirado.');
      }

      user.password = newPassword;
      user.resetPasswordTokenHash = null;
      user.resetPasswordExpiresAt = null;
      await user.save({ transaction });

      return { id: user.id };
    });
  }
}

export = ResetPasswordUseCase;
