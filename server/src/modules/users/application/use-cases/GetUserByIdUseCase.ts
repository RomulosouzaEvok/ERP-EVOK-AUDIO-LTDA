const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');

/**
 * Busca um usuário pelo id, cobrindo o fluxo de `GET /api/users/:id`.
 *
 * Migrado 1:1 do controller anterior
 * `server/src/controllers/userController.ts#getById`.
 */
class GetUserByIdUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/UsersRepository')} usersRepository
   */
  constructor(usersRepository) {
    super();
    this.usersRepository = usersRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id
   * @returns {Promise<Object>} Usuário encontrado (sem `password`).
   * @throws {NotFoundError} Com mensagem `'Usuário não encontrado'` se o id não existir.
   */
  async execute({ id }) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }
    return user;
  }
}

module.exports = GetUserByIdUseCase;


