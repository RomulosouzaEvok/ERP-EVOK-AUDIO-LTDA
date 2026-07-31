/**
 * Contrato do repositorio de Autenticacao/Usuario.
 *
 * @module modules/auth/domain/repositories/AuthRepository
 */

class AuthRepository {
  /**
   * Busca um usuario pelo email, incluindo o hash da senha.
   *
   * @param email - Email do usuario.
   * @returns Usuario encontrado ou null.
   * @throws {Error} Se nao implementado.
   */
  public async findUserByEmail(email: string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AuthRepository.findUserByEmail não implementado.');
  }

  /**
   * Busca um usuario pelo id, sem o campo `password`.
   *
   * @param id - Id do usuario.
   * @returns Usuario encontrado ou null.
   * @throws {Error} Se nao implementado.
   */
  public async findUserById(id: number): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AuthRepository.findUserById não implementado.');
  }

  /**
   * Cria um novo usuario.
   *
   * @param data - Dados do usuario.
   * @returns Usuario criado.
   * @throws {Error} Se nao implementado.
   */
  public async createUser(data: Record<string, unknown>): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AuthRepository.createUser não implementado.');
  }

  /**
   * Busca um usuario pelo id, incluindo o hash da senha, com lock pessimista
   * opcional (para uso em transacao de troca de senha).
   *
   * @param id - Id do usuario.
   * @param transaction - Transacao Sequelize opcional.
   * @returns Usuario encontrado ou null.
   * @throws {Error} Se nao implementado.
   */
  public async findUserByIdWithPasswordForUpdate(id: number, transaction?: unknown): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AuthRepository.findUserByIdWithPasswordForUpdate não implementado.');
  }

  /**
   * Busca um usuario pelo hash SHA-256 do token de recuperacao de senha
   * (SEC-12), com lock pessimista opcional para uso transacional.
   *
   * @param tokenHash - Hash SHA-256 do token recebido do usuario.
   * @param transaction - Transacao Sequelize opcional.
   * @returns Usuario encontrado ou null.
   * @throws {Error} Se nao implementado.
   */
  public async findUserByResetTokenHash(tokenHash: string, transaction?: unknown): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AuthRepository.findUserByResetTokenHash não implementado.');
  }
}

export = AuthRepository;
