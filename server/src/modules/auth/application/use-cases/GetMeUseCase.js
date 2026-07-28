const UseCase = require('../../../../shared/application/UseCase');

/**
 * Retorna os dados do usuário autenticado (sem `password`), cobrindo o
 * fluxo do endpoint `GET /api/auth/me`.
 *
 * Migrado 1:1 do controller legado
 * `server/src/controllers/authController.js#getMe`. Como o middleware
 * `authenticate` já injeta `req.user` (sem `password`) na requisição, este
 * use case apenas relê o usuário pelo id para garantir dados atualizados no
 * momento da chamada — mesmo comportamento do legado.
 */
class GetMeUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/AuthRepository')} authRepository
   */
  constructor(authRepository) {
    super();
    this.authRepository = authRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.userId - Id do usuário autenticado (`req.user.id`).
   * @returns {Promise<Object|null>} Usuário (sem `password`), ou `null` se não encontrado.
   */
  async execute({ userId }) {
    return this.authRepository.findUserById(userId);
  }
}

module.exports = GetMeUseCase;
