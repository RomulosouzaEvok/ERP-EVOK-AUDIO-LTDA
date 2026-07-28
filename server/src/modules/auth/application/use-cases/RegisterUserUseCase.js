const UseCase = require('../../../../shared/application/UseCase');
const { RegisterUserEntity } = require('../../domain/entities/AuthCredentialsEntity');
const { ConflictError } = require('../../../../errors');

/**
 * Cria um novo usuário, cobrindo o fluxo do endpoint `POST /api/auth/register`.
 *
 * Migrado 1:1 do controller legado
 * `server/src/controllers/authController.js#register`: papel padrão
 * `'operator'` quando `role` não é informado; hash da senha feito pelo hook
 * `beforeSave` do model `User` (reutilizado sem alterações); violação de
 * unicidade de email tratada e traduzida para a mesma mensagem
 * `'Email já cadastrado'` do controller legado.
 */
class RegisterUserUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/AuthRepository')} authRepository
   */
  constructor(authRepository) {
    super();
    this.authRepository = authRepository;
  }

  /**
   * @param {Object} input
   * @param {string} input.name
   * @param {string} input.email
   * @param {string} input.password
   * @param {string} [input.role]
   * @returns {Promise<{ id:number, name:string, email:string, role:string }>}
   * @throws {import('../../../../errors').ValidationError} Se algum campo obrigatório estiver ausente, o email for inválido ou a senha for curta demais (forma, validada por `RegisterUserEntity`).
   * @throws {ConflictError} Com mensagem `'Email já cadastrado'` se o email já existir (`SequelizeUniqueConstraintError`).
   */
  async execute({ name, email, password, role }) {
    const entity = new RegisterUserEntity({ name, email, password, role });

    let user;
    try {
      user = await this.authRepository.createUser({
        name: entity.name,
        email: entity.email,
        password: entity.password,
        role: entity.role || 'operator'
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('Email já cadastrado');
      }
      throw error;
    }

    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }
}

module.exports = RegisterUserUseCase;
