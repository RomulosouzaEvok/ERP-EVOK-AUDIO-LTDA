const Entity = require('../../../../shared/domain/Entity');
const { ValidationError } = require('../../../../errors');

/**
 * Entidade de domínio leve que representa a Ordem de Produção (OP) na
 * entrada de criação via `POST /api/production-orders`.
 *
 * Esta entidade valida apenas a FORMA dos dados de entrada (`product_id`,
 * `quantity > 0` e `due_date` obrigatórios). Regras de negócio mais pesadas
 * — produto deve existir, deve estar `active`, deve ser do tipo `finished` —
 * continuam sendo verificadas pelo use case via repositório, consultando o
 * model `Product` diretamente (mesmo comportamento do controller legado).
 */
class ProductionOrderEntity extends Entity {
  /**
   * @param {Object} props - Propriedades da OP.
   * @param {number} [props.id] - Identificador único (quando já persistida).
   * @param {number} props.product_id - Id do produto acabado a ser produzido.
   * @param {number} props.quantity - Quantidade planejada (deve ser > 0).
   * @param {string|Date} props.due_date - Data de vencimento/entrega da OP.
   * @param {string} [props.priority] - Prioridade (`low`/`normal`/`high`/`urgent`).
   * @param {number} [props.responsible_id] - Id do funcionário responsável.
   * @param {number} [props.sales_order_id] - Id do pedido de venda de origem, se houver.
   * @param {string} [props.notes] - Observações.
   * @param {Date|string} [props.createdAt]
   * @param {Date|string} [props.updatedAt]
   * @throws {ValidationError} Se `product_id`, `quantity` ou `due_date` estiverem ausentes/inválidos.
   */
  constructor(props) {
    super({ id: props.id, createdAt: props.createdAt, updatedAt: props.updatedAt });

    this.product_id = props.product_id;
    this.quantity = props.quantity;
    this.due_date = props.due_date;
    this.priority = props.priority;
    this.responsible_id = props.responsible_id;
    this.sales_order_id = props.sales_order_id;
    this.notes = props.notes;

    this.validate();
  }

  /**
   * Executa todas as validações de forma da entidade.
   *
   * @returns {void}
   * @throws {ValidationError} Se algum campo obrigatório estiver ausente ou inválido.
   */
  validate() {
    if (!this.product_id) {
      throw new ValidationError('Produto, quantidade e data de vencimento são obrigatórios');
    }
    if (!this.quantity) {
      throw new ValidationError('Produto, quantidade e data de vencimento são obrigatórios');
    }
    if (!this.due_date) {
      throw new ValidationError('Produto, quantidade e data de vencimento são obrigatórios');
    }
    if (parseFloat(this.quantity) <= 0) {
      throw new ValidationError('Quantidade deve ser maior que zero');
    }
  }

  /**
   * Serializa a entidade para os parâmetros aceitos por `CreateProductionOrderUseCase`.
   *
   * @returns {{ product_id: number, quantity: number, due_date: (string|Date), priority: (string|undefined), responsible_id: (number|undefined), sales_order_id: (number|undefined), notes: (string|undefined) }}
   */
  toPersistence() {
    return {
      product_id: this.product_id,
      quantity: this.quantity,
      due_date: this.due_date,
      priority: this.priority,
      responsible_id: this.responsible_id,
      sales_order_id: this.sales_order_id,
      notes: this.notes
    };
  }
}

module.exports = ProductionOrderEntity;
