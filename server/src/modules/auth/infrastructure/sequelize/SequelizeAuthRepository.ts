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
}

export = SequelizeAuthRepository;
