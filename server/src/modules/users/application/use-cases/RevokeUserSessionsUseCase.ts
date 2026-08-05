const { UseCase } = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');
const { logAction } = require('../../../../services/auditLogService');

/**
 * Revogação emergencial de sessão (SEC-12): incrementa `password_version`
 * de um usuário sem exigir a senha atual, invalidando de imediato todos os
 * tokens JWT emitidos anteriormente para ele. Uso típico: credencial
 * comprometida, funcionário desligado, ou administrador sem acesso à conta
 * para trocar a própria senha.
 */
class RevokeUserSessionsUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/UsersRepository')} usersRepository
   */
  constructor(usersRepository: any) {
    super();
    this.usersRepository = usersRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id do usuário cujas sessões serão revogadas.
   * @param {import('express').Request} input.req - Requisição original, repassada para `logAction`.
   * @returns {Promise<{ message: string }>}
   * @throws {NotFoundError} Se o id não existir.
   */
  async execute({ id, req }: { id: number; req: any }) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    await this.usersRepository.incrementPasswordVersion(id);

    logAction(req, {
      action: 'update',
      entityType: 'User',
      entityId: user.id,
      entityDescription: user.email,
      description: `Sessões de ${user.email} revogadas manualmente (password_version incrementada)`
    });

    return { message: 'Sessões do usuário revogadas com sucesso. Ele precisará fazer login novamente.' };
  }
}

module.exports = RevokeUserSessionsUseCase;
