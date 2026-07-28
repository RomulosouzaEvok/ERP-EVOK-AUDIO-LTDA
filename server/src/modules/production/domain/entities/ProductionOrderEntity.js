const Entity = require('../../../../shared/domain/Entity');
const { ValidationError, BusinessRuleError } = require('../../../../errors');

const PRODUCTION_STATUSES = ['planned', 'released', 'in_progress', 'paused', 'completed', 'canceled'];
const PRODUCTION_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const STATUS_TRANSITIONS = {
  planned: ['released', 'canceled'],
  released: ['in_progress', 'canceled'],
  in_progress: ['completed', 'paused', 'canceled'],
  paused: ['in_progress', 'canceled'],
  completed: [],
  canceled: []
};

class ProductionOrderEntity extends Entity {
  constructor(props) {
    super({ id: props.id, createdAt: props.createdAt, updatedAt: props.updatedAt });

    this.order_number = props.order_number;
    this.product_id = props.product_id;
    this.quantity = Number(props.quantity);
    this.quantity_produced = props.quantity_produced !== undefined ? Number(props.quantity_produced) : 0;
    this.priority = props.priority || 'normal';
    this.status = props.status || 'planned';
    this.due_date = props.due_date;
    this.start_date = props.start_date ?? null;
    this.completion_date = props.completion_date ?? null;
    this.sales_order_id = props.sales_order_id ?? null;
    this.responsible_id = props.responsible_id ?? null;
    this.notes = props.notes ?? null;
    this.created_by = props.created_by ?? null;

    this.validate();
  }

  validate() {
    if (!this.product_id) {
      throw new ValidationError('Produto da ordem de producao e obrigatorio');
    }
    if (!Number.isFinite(this.quantity) || this.quantity <= 0) {
      throw new ValidationError('Quantidade planejada deve ser maior que zero');
    }
    if (!Number.isFinite(this.quantity_produced) || this.quantity_produced < 0) {
      throw new ValidationError('Quantidade produzida nao pode ser negativa');
    }
    if (!this.due_date) {
      throw new ValidationError('Data de vencimento e obrigatoria');
    }
    if (!PRODUCTION_PRIORITIES.includes(this.priority)) {
      throw new ValidationError(`Prioridade invalida. Valores aceitos: ${PRODUCTION_PRIORITIES.join(', ')}`);
    }
    if (!PRODUCTION_STATUSES.includes(this.status)) {
      throw new ValidationError(`Status invalido. Valores aceitos: ${PRODUCTION_STATUSES.join(', ')}`);
    }
  }

  assertCanBeCreatedFor(product) {
    if (!product) {
      throw new BusinessRuleError('Produto nao encontrado');
    }
    if (product.status !== 'active') {
      throw new BusinessRuleError('Produto inativo nao pode ser produzido');
    }
    if (product.product_type !== 'finished') {
      throw new BusinessRuleError(`Apenas produtos acabados tem OP. '${product.name}' e '${product.product_type}'`);
    }
  }

  /**
   * @param {string} nextStatus - Status alvo da transicao.
   * @param {number} [quantityProduced] - Quantidade produzida, usada apenas quando `nextStatus === 'completed'`.
   * @param {Object} [options]
   * @param {boolean} [options.allowOverproduction=false] - Quando `false` (padrao), bloqueia apontar
   *   `quantityProduced` maior que a quantidade planejada (`this.quantity`) — regra explicita pedida no
   *   TODO ("Apontamento nao pode exceder quantidade planejada sem regra explicita"). Passe `true` para
   *   permitir producao acima do planejado deliberadamente (ex.: ordem consolidada, retrabalho).
   * @returns {Object} Campos a persistir na OP.
   * @throws {BusinessRuleError} Se a transicao de status nao for permitida ou a OP ja estiver no status alvo.
   * @throws {ValidationError} Se `quantityProduced` for negativo ou exceder o planejado sem `allowOverproduction`.
   */
  transitionTo(nextStatus, quantityProduced, options = {}) {
    const { allowOverproduction = false } = options;
    const allowed = STATUS_TRANSITIONS[this.status] || [];
    if (this.status === nextStatus) {
      throw new BusinessRuleError(`OP ja esta com status ${nextStatus}`);
    }
    if (!allowed.includes(nextStatus)) {
      throw new BusinessRuleError(`Transicao invalida: ${this.status} -> ${nextStatus}`);
    }

    const changes = { status: nextStatus };
    if (nextStatus === 'in_progress') changes.start_date = new Date();
    if (nextStatus === 'completed') {
      const produced = quantityProduced !== undefined ? Number(quantityProduced) : this.quantity;
      if (!Number.isFinite(produced) || produced < 0) {
        throw new ValidationError('Quantidade produzida nao pode ser negativa');
      }
      if (produced > this.quantity && !allowOverproduction) {
        throw new ValidationError(
          `Quantidade produzida (${produced}) excede a quantidade planejada (${this.quantity}). ` +
          `Envie "allow_overproduction: true" na requisicao para confirmar producao acima do planejado.`
        );
      }
      changes.quantity_produced = produced;
      changes.completion_date = new Date();
    }

    return changes;
  }

  toCreatePersistence({ order_number, created_by }) {
    return {
      order_number,
      product_id: this.product_id,
      quantity: this.quantity,
      priority: this.priority,
      status: 'planned',
      due_date: this.due_date,
      sales_order_id: this.sales_order_id,
      responsible_id: this.responsible_id,
      notes: this.notes,
      created_by
    };
  }
}

module.exports = ProductionOrderEntity;
module.exports.PRODUCTION_STATUSES = PRODUCTION_STATUSES;
module.exports.PRODUCTION_PRIORITIES = PRODUCTION_PRIORITIES;
module.exports.STATUS_TRANSITIONS = STATUS_TRANSITIONS;
