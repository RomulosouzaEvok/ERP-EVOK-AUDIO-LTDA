/**
 * Implementacao Sequelize do repositorio de autenticacao/usuario.
 *
 * @module modules/auth/infrastructure/sequelize/SequelizeAuthRepository
 */

import AuthRepository from '../../domain/repositories/AuthRepository';
const { User }: any = require('../../../../models/index');

class SequelizeAuthRepository extends AuthRepository {
  /** @param email - Email do usuario. @returns Instancia do model `User` (com `password`). */
  public async findUserByEmail(email: string): Promise<any | null> {
    return User.findOne({ where: { email } });
  }

  /** @param id - Id do usuario. @returns Instancia do model `User` sem `password`. */
  public async findUserById(id: number): Promise<any | null> {
    return User.findByPk(id, { attributes: { exclude: ['password'] } });
  }

  /** @param data - Dados do usuario. @returns Usuario criado. */
  public async createUser(data: Record<string, unknown>): Promise<any> {
    return User.create(data);
  }

  /**
   * @param id - Id do usuario.
   * @param transaction - Transacao Sequelize opcional, usada para bloquear a linha (`FOR UPDATE`).
   * @returns Instancia do model `User` (com `password`) ou null.
   */
  public async findUserByIdWithPasswordForUpdate(id: number, transaction?: unknown): Promise<any | null> {
    return User.findByPk(id, transaction ? { transaction, lock: (transaction as any).LOCK?.UPDATE } : undefined);
  }

  /**
   * @param tokenHash - Hash SHA-256 do token de recuperacao de senha.
   * @param transaction - Transacao Sequelize opcional, usada para bloquear a linha (`FOR UPDATE`).
   * @returns Instancia do model `User` (com `password`) ou null.
   */
  public async findUserByResetTokenHash(tokenHash: string, transaction?: unknown): Promise<any | null> {
    return User.findOne({
      where: { resetPasswordTokenHash: tokenHash },
      ...(transaction ? { transaction, lock: (transaction as any).LOCK?.UPDATE } : {}),
    });
  }
}

export = SequelizeAuthRepository;
