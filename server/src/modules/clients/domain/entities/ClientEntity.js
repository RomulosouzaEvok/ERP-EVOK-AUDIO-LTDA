const Entity = require('../../../../shared/domain/Entity');
const { ValidationError } = require('../../../../errors');

/**
 * Entidade de domínio leve que representa um Cliente (`Client`) na criação.
 *
 * Valida apenas a FORMA dos dados de entrada (`name` e `cpf_cnpj`
 * obrigatórios), exatamente como o controller legado
 * `server/src/controllers/clientController.js#create`. A validação do
 * dígito verificador do CPF/CNPJ continua centralizada em
 * `Validators.validateDocument` (`server/src/utils/validators.js`), chamada
 * pelo use case `CreateClientUseCase`, não duplicada aqui.
 */
class ClientEntity extends Entity {
  /**
   * @param {Object} props
   * @param {number} [props.id]
   * @param {string} props.name - Nome/razão social do cliente (obrigatório).
   * @param {string} props.cpf_cnpj - CPF ou CNPJ do cliente (obrigatório; dígito verificador validado no use case).
   * @param {string} [props.phone]
   * @param {string} [props.email]
   * @param {string} [props.address] - Campo aceito pelo controller legado, sem correspondência de coluna no model `Client` (sem efeito na persistência, mesmo comportamento legado).
   * @param {string} [props.notes]
   * @param {string} [props.tax_regime]
   * @param {string} [props.ie]
   * @param {string} [props.im]
   * @param {string} [props.cep]
   * @param {string} [props.street]
   * @param {string} [props.number]
   * @param {string} [props.complement]
   * @param {string} [props.neighborhood]
   * @param {string} [props.city]
   * @param {string} [props.state]
   * @throws {ValidationError} Se `name` ou `cpf_cnpj` estiverem ausentes.
   */
  constructor(props) {
    super({ id: props.id });
    this.name = props.name;
    this.cpf_cnpj = props.cpf_cnpj;
    this.phone = props.phone ?? null;
    this.email = props.email ?? null;
    this.address = props.address ?? null;
    this.notes = props.notes ?? null;
    this.tax_regime = props.tax_regime ?? null;
    this.ie = props.ie ?? null;
    this.im = props.im ?? null;
    this.cep = props.cep ?? null;
    this.street = props.street ?? null;
    this.number = props.number ?? null;
    this.complement = props.complement ?? null;
    this.neighborhood = props.neighborhood ?? null;
    this.city = props.city ?? null;
    this.state = props.state ?? null;

    this.validate();
  }

  /**
   * Executa todas as validações de forma da entidade.
   *
   * @returns {void}
   * @throws {ValidationError} Se `name` ou `cpf_cnpj` estiverem ausentes.
   */
  validate() {
    if (!this.name || !this.cpf_cnpj) {
      throw new ValidationError('Nome e CPF/CNPJ são obrigatórios');
    }
  }
}

module.exports = ClientEntity;
