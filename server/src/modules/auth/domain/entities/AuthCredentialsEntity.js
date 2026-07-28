const Entity = require('../../../../shared/domain/Entity');
const { ValidationError } = require('../../../../errors');

/** Mesma regex de formato de email usada pelo controller legado `authController.js#register`. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Entidade de domínio leve que representa as credenciais informadas em
 * `POST /api/auth/login`.
 *
 * Valida apenas a FORMA dos dados de entrada (`email`/`password`
 * obrigatórios), exatamente como o controller legado
 * `server/src/controllers/authController.js#login`. Regras de negócio mais
 * pesadas (usuário existe, senha confere, usuário ativo) permanecem no
 * `LoginUseCase`, que preserva a mensagem genérica "Email ou senha
 * incorretos" para ambos os casos de falha, por segurança (não revelar se o
 * email existe).
 */
class LoginCredentialsEntity extends Entity {
  /**
   * @param {Object} props
   * @param {string} props.email - Email informado (obrigatório).
   * @param {string} props.password - Senha informada (obrigatória).
   * @throws {ValidationError} Se `email` ou `password` estiverem ausentes.
   */
  constructor({ email, password }) {
    super({});
    this.email = email;
    this.password = password;
    this.validate();
  }

  /**
   * @returns {void}
   * @throws {ValidationError} Se algum campo obrigatório estiver ausente.
   */
  validate() {
    if (!this.email || !this.password) {
      throw new ValidationError('Email e senha são obrigatórios');
    }
  }
}

/**
 * Entidade de domínio leve que representa os dados informados em
 * `POST /api/auth/register`.
 *
 * Valida apenas a FORMA dos dados de entrada (`name`/`email`/`password`
 * obrigatórios, formato de email válido, senha com no mínimo 6 caracteres),
 * exatamente como o controller legado
 * `server/src/controllers/authController.js#register`. A verificação de
 * unicidade do email (constraint do banco) permanece tratada no
 * `RegisterUserUseCase`/`SequelizeAuthRepository`.
 */
class RegisterUserEntity extends Entity {
  /**
   * @param {Object} props
   * @param {string} props.name - Nome do usuário (obrigatório).
   * @param {string} props.email - Email do usuário (obrigatório, formato válido).
   * @param {string} props.password - Senha do usuário (obrigatória, mínimo 6 caracteres).
   * @param {string} [props.role] - Papel do usuário (padrão `'operator'`, aplicado pelo use case).
   * @throws {ValidationError} Se algum campo obrigatório estiver ausente, o email tiver formato inválido ou a senha tiver menos de 6 caracteres.
   */
  constructor({ name, email, password, role }) {
    super({});
    this.name = name;
    this.email = email;
    this.password = password;
    this.role = role;
    this.validate();
  }

  /**
   * @returns {void}
   * @throws {ValidationError} Se algum campo obrigatório estiver ausente, o email for inválido ou a senha for curta demais.
   */
  validate() {
    if (!this.name || !this.email || !this.password) {
      throw new ValidationError('Nome, email e senha são obrigatórios');
    }
    if (!EMAIL_REGEX.test(this.email)) {
      throw new ValidationError('Formato de email inválido');
    }
    if (this.password.length < 6) {
      throw new ValidationError('Senha deve ter no mínimo 6 caracteres');
    }
  }
}

module.exports = { LoginCredentialsEntity, RegisterUserEntity, EMAIL_REGEX };
