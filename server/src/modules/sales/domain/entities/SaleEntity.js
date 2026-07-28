const Entity = require('../../../../shared/domain/Entity');
const { ValidationError } = require('../../../../errors');

/**
 * Entidade de domínio leve que representa uma Venda na criação.
 *
 * Valida apenas a FORMA dos dados de entrada (`customer_id` obrigatório,
 * lista de itens não vazia, cada item com `product_id`/`quantity > 0`/
 * `unit_price > 0`, `installments >= 1`, `discount >= 0`). Regras de
 * negócio mais pesadas — existência/status do produto, validação de
 * estoque disponível, cálculo do total em centavos, geração das parcelas
 * em `AccountReceivable` — permanecem no use case, exatamente como no
 * controller legado `server/src/controllers/saleController.js`, para
 * preservar 100% do comportamento já em produção.
 */
class SaleEntity extends Entity {
  /**
   * @param {Object} props
   * @param {number} [props.id]
   * @param {number} props.customer_id - Id do cliente (obrigatório).
   * @param {Array<{product_id:number, quantity:number, unit_price:number}>} props.items - Itens da venda (obrigatório, não vazio).
   * @param {number} [props.discount=0] - Desconto em reais (deve ser >= 0).
   * @param {string} [props.payment_method]
   * @param {number} [props.installments=1] - Número de parcelas (deve ser >= 1).
   * @param {string} [props.notes]
   * @throws {ValidationError} Se `customer_id` ausente, `items` vazio/ausente, algum item inválido, `installments < 1` ou `discount < 0`.
   */
  constructor(props) {
    super({ id: props.id });
    this.customer_id = props.customer_id;
    this.items = props.items;
    this.discount = props.discount ?? 0;
    this.payment_method = props.payment_method ?? null;
    this.installments = props.installments ?? 1;
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
    if (!this.customer_id) {
      throw new ValidationError('Cliente é obrigatório');
    }
    if (!this.items || this.items.length === 0) {
      throw new ValidationError('Adicione pelo menos um item à venda');
    }
    if (this.installments < 1) {
      throw new ValidationError('Número de parcelas deve ser maior ou igual a 1');
    }
    const parsedDiscount = parseFloat(this.discount) || 0;
    if (parsedDiscount < 0) {
      throw new ValidationError('Desconto não pode ser negativo');
    }
    for (const item of this.items) {
      if (!item.product_id || item.quantity === undefined || item.unit_price === undefined) {
        throw new ValidationError('Cada item deve ter product_id, quantity e unit_price');
      }
      const qty = parseInt(item.quantity);
      if (Number.isNaN(qty) || qty <= 0) {
        throw new ValidationError('Quantidade deve ser maior que zero');
      }
      const unitPrice = parseFloat(item.unit_price);
      if (Number.isNaN(unitPrice) || unitPrice <= 0) {
        throw new ValidationError('Preço unitário deve ser maior que zero');
      }
    }
  }
}

module.exports = SaleEntity;
