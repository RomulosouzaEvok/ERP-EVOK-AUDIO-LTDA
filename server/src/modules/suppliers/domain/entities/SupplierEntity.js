const Entity = require('../../../../shared/domain/Entity');
const { ValidationError } = require('../../../../errors');

/**
 * Entidade de domínio leve que representa um Fornecedor (`Supplier`) na
 * criação.
 *
 * Valida apenas a FORMA dos dados de entrada (`company_name` e `cnpj`
 * obrigatórios), exatamente como o controller legado
 * `server/src/controllers/supplierController.js#create`. A validação do
 * dígito verificador do CNPJ continua centralizada em
 * `Validators.validateDocument` (`server/src/utils/validators.js`), chamada
 * pelo use case `CreateSupplierUseCase`, não duplicada aqui.
 */
class SupplierEntity extends Entity {
  /**
   * @param {Object} props
   * @param {number} [props.id]
   * @param {string} props.company_name - Razão social do fornecedor (obrigatória).
   * @param {string} props.cnpj - CNPJ do fornecedor (obrigatório; dígito verificador validado no use case).
   * @param {string} [props.trade_name]
   * @param {string} [props.ie]
   * @param {string} [props.phone]
   * @param {string} [props.email]
   * @param {string} [props.address]
   * @param {string} [props.contact_name]
   * @param {string} [props.contact_phone]
   * @param {string} [props.payment_terms]
   * @param {number} [props.delivery_time]
   * @param {string} [props.notes]
   * @throws {ValidationError} Se `company_name` ou `cnpj` estiverem ausentes.
   */
  constructor(props) {
    super({ id: props.id });
    this.company_name = props.company_name;
    this.cnpj = props.cnpj;
    this.trade_name = props.trade_name ?? null;
    this.ie = props.ie ?? null;
    this.phone = props.phone ?? null;
    this.email = props.email ?? null;
    this.address = props.address ?? null;
    this.contact_name = props.contact_name ?? null;
    this.contact_phone = props.contact_phone ?? null;
    this.payment_terms = props.payment_terms ?? null;
    this.delivery_time = props.delivery_time ?? 15;
    this.notes = props.notes ?? null;

    this.validate();
  }

  /**
   * Executa todas as validações de forma da entidade.
   *
   * @returns {void}
   * @throws {ValidationError} Se `company_name` ou `cnpj` estiverem ausentes.
   */
  validate() {
    if (!this.company_name || !this.cnpj) {
      throw new ValidationError('Razão social e CNPJ são obrigatórios');
    }
  }
}

module.exports = SupplierEntity;
