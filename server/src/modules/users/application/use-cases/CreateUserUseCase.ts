const { UseCase } = require('../../../../shared/application/UseCase');
const { RegisterUserEntity } = require('../../../auth/domain/entities/AuthCredentialsEntity');
const { VALID_ROLES } = require('../../domain/entities/UpdateUserEntity');
const { ValidationError, ConflictError } = require('../../../../errors');
const { logAction } = require('../../../../services/auditLogService');

/**
 * Cria um novo usuário, cobrindo o fluxo do endpoint `POST /api/users`.
 *
 * Migrado 1:1 do controller anterior
 * `server/src/controllers/userController.ts#create`: reutiliza a validação
 * de forma (nome/email/senha obrigatórios, email válido, senha >= 6
 * caracteres) já implementada por `RegisterUserEntity` do módulo `auth`
 * (mesma regra, evitando duplicação), acrescida da validação de `role`
 * válido (`'admin'|'operator'|'financial'`), papel padrão `'operator'`
 * quando não informado, hash da senha feito pelo hook `beforeSave` do
 * model `User`, violação de unicidade de email traduzida para
 * `'Email já cadastrado'`, e auditoria via `logAction` idêntica ao anterior.
 */
class CreateUserUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/UsersRepository')} usersRepository
   */
  constructor(usersRepository: any) {
    super();
    this.usersRepository = usersRepository;
  }

  /**
   * @param {Object} input
   * @param {string} input.name
   * @param {string} input.email
   * @param {string} input.password
   * @param {string} [input.role]
   * @param {import('express').Request} input.req - Requisição original, repassada para `logAction`.
   * @returns {Promise<{ id:number, name:string, email:string, role:string }>}
   * @throws {ValidationError} Se algum campo obrigatório estiver ausente, o email for inválido, a senha for curta demais (via `RegisterUserEntity`) ou `role` for inválido.
   * @throws {ConflictError} Com mensagem `'Email já cadastrado'` se o email já existir (`SequelizeUniqueConstraintError`).
   */
  async execute({ name, email, password, role, req }: { name: string; email: string; password: string; role?: string; req: any }) {
    const entity = new RegisterUserEntity({ name, email, password, role });

    if (role && !VALID_ROLES.includes(role)) {
      throw new ValidationError(`Perfil inválido. Use: ${VALID_ROLES.join(', ')}`);
    }

    let user;
    try {
      user = await this.usersRepository.create({
        name: entity.name,
        email: entity.email,
        password: entity.password,
        role: entity.role || 'operator'
      });
    } catch (error: any) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('Email já cadastrado');
      }
      throw error;
    }

    logAction(req, {
      action: 'create',
      entityType: 'User',
      entityId: user.id,
      entityDescription: user.email,
      newValues: { name: user.name, email: user.email, role: user.role },
      description: `Usuário ${user.email} criado`
    });

    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }
}

module.exports = CreateUserUseCase;


