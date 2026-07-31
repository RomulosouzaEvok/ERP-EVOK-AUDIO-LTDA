/**
 * Use case: troca de senha autenticada (SEC-09), invalidando sessoes antigas
 * via incremento de `password_version` (SEC-10).
 *
 * @module modules/auth/application/use-cases/ChangePasswordUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, UnauthorizedError, ValidationError } from '../../../../errors';
import AuthRepository from '../../domain/repositories/AuthRepository';

const { sequelize } = require('../../../../config/database');

interface ChangePasswordInput {
  userId: number;
  currentPassword: string;
  newPassword: string;
}

interface ChangePasswordOutput {
  id: number;
  passwordVersion: number;
}

class ChangePasswordUseCase extends UseCase<ChangePasswordInput, ChangePasswordOutput> {
  private readonly authRepository: AuthRepository;

  /**
   * @param authRepository - Repositorio de autenticacao.
   */
  public constructor(authRepository: AuthRepository) {
    super();
    this.authRepository = authRepository;
  }

  /**
   * @param input - Id do usuario autenticado, senha atual e nova senha.
   * @returns Id do usuario e nova `passwordVersion`.
   * @throws {NotFoundError} Se o usuario nao existir.
   * @throws {UnauthorizedError} Se a senha atual estiver incorreta.
   * @throws {ValidationError} Se a nova senha for igual a atual.
   */
  public async execute({ userId, currentPassword, newPassword }: ChangePasswordInput): Promise<ChangePasswordOutput> {
    return sequelize.transaction(async (transaction: unknown) => {
      const user: any = await this.authRepository.findUserByIdWithPasswordForUpdate(userId, transaction);
      if (!user) {
        throw new NotFoundError('Usuário não encontrado');
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        throw new UnauthorizedError('Senha atual incorreta');
      }

      const isSamePassword = await user.comparePassword(newPassword);
      if (isSamePassword) {
        throw new ValidationError('A nova senha deve ser diferente da senha atual.');
      }

      user.password = newPassword;
      await user.save({ transaction });

      return { id: user.id, passwordVersion: user.passwordVersion };
    });
  }
}

export = ChangePasswordUseCase;
