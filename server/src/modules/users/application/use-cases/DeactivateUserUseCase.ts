const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, BusinessRuleError } = require('../../../../errors');
const { logAction } = require('../../../../services/auditLogService');

/**
 * Inativa (soft delete via `active=false`) um usuário, cobrindo o fluxo de
 * `DELETE /api/users/:id`.
 *
 * Migrado 1:1 do controller anterior
 * `server/src/controllers/userController.ts#remove`: bloqueia
 * auto-inativação (usuário autenticado não pode inativar a si mesmo).
 */
class DeactivateUserUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/UsersRepository')} usersRepository
   */
  constructor(usersRepository) {
    super();
    this.usersRepository = usersRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id do usuário a inativar.
   * @param {number} input.currentUserId - Id do usuário autenticado (`req.user.id`).
   * @param {import('express').Request} input.req - Requisição original, repassada para `logAction`.
   * @returns {Promise<{ message: string }>}
   * @throws {BusinessRuleError} Com mensagem `'Você não pode inativar seu próprio usuário'` se `id === currentUserId`.
   * @throws {NotFoundError} Com mensagem `'Usuário não encontrado'` se o id não existir.
   */
  async execute({ id, currentUserId, req }) {
    if (id === currentUserId) {
      throw new BusinessRuleError('Você não pode inativar seu próprio usuário');
    }

    const before = await this.usersRepository.findById(id);
    if (!before) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const updated = await this.usersRepository.update(id, { active: false });
    if (!updated) {
      throw new NotFoundError('Usuário não encontrado');
    }

    logAction(req, {
      action: 'soft_delete',
      entityType: 'User',
      entityId: before.id,
      entityDescription: before.email,
      oldValues: { active: before.active },
      newValues: { active: false },
      description: `Usuário ${before.email} inativado`
    });

    return { message: 'Usuário inativado com sucesso' };
  }
}

module.exports = DeactivateUserUseCase;


