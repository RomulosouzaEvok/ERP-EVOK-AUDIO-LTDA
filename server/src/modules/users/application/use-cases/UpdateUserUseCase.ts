const UseCase = require('../../../../shared/application/UseCase');
const { UpdateUserEntity } = require('../../domain/entities/UpdateUserEntity');
const { NotFoundError, ConflictError } = require('../../../../errors');
const { logAction } = require('../../../../services/auditLogService');

/**
 * Atualiza um usuário existente, cobrindo o fluxo de `PUT /api/users/:id`.
 *
 * Migrado 1:1 do controller anterior
 * `server/src/controllers/userController.ts#update`: bloqueia troca de
 * senha por este endpoint, valida o formato do email quando informado
 * (via `UpdateUserEntity`), atualiza apenas os campos permitidos
 * (`name`, `email`, `role`, `active`), audita com `oldValues`/`newValues`
 * e traduz violação de unicidade de email para `'Email já cadastrado'`.
 */
class UpdateUserUseCase extends UseCase {
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
   * @param {string} [input.name]
   * @param {string} [input.email]
   * @param {string} [input.role]
   * @param {boolean} [input.active]
   * @param {*} [input.password] - Se presente, a atualização é bloqueada.
   * @param {import('express').Request} input.req - Requisição original, repassada para `logAction`.
   * @returns {Promise<Object>} Usuário atualizado (sem `password`).
   * @throws {import('../../../../errors').ValidationError} Se `password` for informado ou o email for inválido (via `UpdateUserEntity`).
   * @throws {NotFoundError} Com mensagem `'Usuário não encontrado'` se o id não existir.
   * @throws {ConflictError} Com mensagem `'Email já cadastrado'` se o novo email já existir (`SequelizeUniqueConstraintError`).
   */
  async execute({ id, name, email, role, active, password, req }) {
    const entity = new UpdateUserEntity({ name, email, role, active, password });
    const updateData = entity.toUpdateData();

    const before = await this.usersRepository.findById(id);
    if (!before) {
      throw new NotFoundError('Usuário não encontrado');
    }
    const oldValues: any = {};
    for (const field of Object.keys(updateData)) oldValues[field] = before[field];

    let updated;
    try {
      updated = await this.usersRepository.update(id, updateData);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('Email já cadastrado');
      }
      throw error;
    }
    if (!updated) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const user = await this.usersRepository.findById(id);

    logAction(req, {
      action: 'update',
      entityType: 'User',
      entityId: user.id,
      entityDescription: user.email,
      oldValues,
      newValues: updateData,
      description: `Usuário ${user.email} atualizado`
    });

    return user;
  }
}

module.exports = UpdateUserUseCase;



