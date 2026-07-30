const { UseCase } = require('../../../../shared/application/UseCase');

/**
 * Lista usuários com busca/filtro e paginação, cobrindo o fluxo de
 * `GET /api/users`.
 *
 * Migrado 1:1 do controller anterior
 * `server/src/controllers/userController.ts#list`.
 */
class ListUsersUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/UsersRepository')} usersRepository
   */
  constructor(usersRepository) {
    super();
    this.usersRepository = usersRepository;
  }

  /**
   * @param {Object} input
   * @param {number|string} [input.page=1]
   * @param {number|string} [input.limit=10]
   * @param {string} [input.search] - Busca por `name`/`email`.
   * @param {string} [input.role] - Filtro exato de papel.
   * @param {string|boolean} [input.active] - Filtro exato de ativo/inativo (`'true'`/`'false'` ou boolean).
   * @returns {Promise<{ rows: Object[], count: number, page: number, limit: number }>}
   */
  async execute({ page = 1, limit = 10, search, role, active }: any = {}) {
    const parsedPage = parseInt(String(page), 10);
    const parsedLimit = parseInt(String(limit), 10);
    const parsedActive = active !== undefined ? active === true || active === 'true' : undefined;

    const { count, rows } = await this.usersRepository.list({
      page: parsedPage,
      limit: parsedLimit,
      search,
      role,
      active: parsedActive
    });

    return { rows, count, page: parsedPage, limit: parsedLimit };
  }
}

module.exports = ListUsersUseCase;




