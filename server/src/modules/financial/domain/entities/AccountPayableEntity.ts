const Entity = require('../../../../shared/domain/Entity');
const { ValidationError } = require('../../../../errors');

/**
 * Entidade de domínio leve que representa uma Conta a Pagar
 * (`AccountPayable`) na criação.
 *
 * Valida apenas a FORMA dos dados de entrada (descrição, valor e data de
 * vencimento obrigatórios; valor maior que zero), exatamente como o
 * controller anterior `server/src/controllers/financeController.ts#createPayable`.
 * Regras de negócio adicionais (existência de fornecedor/pedido de compra,
 * persistência) permanecem no use case/repositório.
 */
class AccountPayableEntity extends Entity {
  /**
   * @param {Object} props
   * @param {number} [props.id]
   * @param {string} props.description - Descrição da conta a pagar (obrigatória).
   * @param {number|string} props.amount - Valor da conta, deve ser maior que zero (obrigatório).
   * @param {string|Date} props.due_date - Data de vencimento (obrigatória).
   * @param {string} [props.category]
   * @param {number} [props.supplier_id]
   * @param {number} [props.purchase_id]
   * @param {'nfe'|'nfse'} [props.invoice_type] - Tipo de nota vinculada (mercadoria ou serviço/licença digital).
   * @param {string} [props.notes]
   * @throws {ValidationError} Se `description`, `amount` ou `due_date` estiverem ausentes, ou `amount` não for maior que zero.
   */
  constructor(props) {
    super({ id: props.id });
    this.description = props.description;
    this.amount = props.amount;
    this.due_date = props.due_date;
    this.category = props.category ?? null;
    this.supplier_id = props.supplier_id ?? null;
    this.purchase_id = props.purchase_id ?? null;
    this.invoice_type = props.invoice_type ?? null;
    this.notes = props.notes ?? null;

    this.validate();
  }

  /**
   * Executa todas as validações de forma da entidade.
   *
   * @returns {void}
   * @throws {ValidationError} Se algum campo obrigatório estiver ausente ou inválido.
   */
  validate() {
    if (!this.description || this.amount === undefined || this.amount === null || !this.due_date) {
      throw new ValidationError('Descrição, valor e data de vencimento são obrigatórios');
    }
    const parsedAmount = parseFloat(this.amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new ValidationError('Valor deve ser maior que zero');
    }
  }
}

module.exports = AccountPayableEntity;


