const Entity = require('../../../../shared/domain/Entity');
const { ValidationError } = require('../../../../errors');
const { EMAIL_REGEX } = require('../../../auth/domain/entities/AuthCredentialsEntity');

/** Papéis válidos de usuário, idêntico ao controller anterior `userController.ts#create`. */
const VALID_ROLES = ['admin', 'operator', 'financial'];

/**
 * Entidade de domínio leve que representa os dados aceitos por
 * `PUT /api/users/:id`.
 *
 * Valida apenas a FORMA dos dados de entrada, exatamente como o controller
 * anterior `server/src/controllers/userController.ts#update`: bloqueia troca
 * de senha por este endpoint e valida o formato do email quando informado.
 * Nenhum campo é obrigatório aqui (update parcial, mesmo comportamento do
 * anterior, que copia apenas os campos presentes em `allowedFields`).
 */
class UpdateUserEntity extends Entity {
  /**
   * @param {Object} props
   * @param {string} [props.name]
   * @param {string} [props.email]
   * @param {string} [props.role]
   * @param {boolean} [props.active]
   * @param {*} [props.password] - Presença (mesmo `undefined`/`null` explícito não conta) bloqueia a atualização.
   * @throws {ValidationError} Se `password` for informado ou o email tiver formato inválido.
   */
  name: any;
  email: any;
  role: any;
  active: any;
  password: any;

  constructor({ name, email, role, active, password }: any = {}) {
    super({});
    this.name = name;
    this.email = email;
    this.role = role;
    this.active = active;
    this.password = password;
    this.validate();
  }

  /**
   * @returns {void}
   * @throws {ValidationError} Se `password` estiver presente ou o email for inválido.
   */
  validate() {
    if (this.password !== undefined) {
      throw new ValidationError('Use endpoint específico para alterar senha');
    }
    if (this.email !== undefined && !EMAIL_REGEX.test(this.email)) {
      throw new ValidationError('Formato de email inválido');
    }
  }

  /**
   * Monta o objeto de atualização apenas com os campos permitidos que foram
   * de fato informados, mesmo comportamento do `allowedFields` do
   * controller anterior.
   *
   * @returns {Object} Campos a atualizar (`name`, `email`, `role`, `active`).
   */
  toUpdateData() {
    const data: any = {};
    if (this.name !== undefined) data.name = this.name;
    if (this.email !== undefined) data.email = this.email;
    if (this.role !== undefined) data.role = this.role;
    if (this.active !== undefined) data.active = this.active;
    return data;
  }
}

module.exports = { UpdateUserEntity, VALID_ROLES };



