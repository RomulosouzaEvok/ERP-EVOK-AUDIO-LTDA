const Entity = require('../../../../shared/domain/Entity');
const { ValidationError, BusinessRuleError } = require('../../../../errors');
const ThieleSmallParams = require('../value-objects/ThieleSmallParams');

/** Tipos de produto suportados (mesmo ENUM do model Sequelize `Product.product_type`). */
const PRODUCT_TYPES = ['finished', 'semi_finished', 'component', 'raw_material'];

/** Status suportados (mesmo ENUM do model Sequelize `Product.status`). */
const PRODUCT_STATUSES = ['active', 'inactive'];

/**
 * Entidade de domínio Produto: representa um item de catálogo da fábrica de
 * alto-falantes (produto acabado, semi-acabado, componente ou matéria-prima),
 * incluindo seus parâmetros técnicos Thiele-Small quando aplicável.
 *
 * Concentra as regras de negócio anteriormente espalhadas em
 * `server/src/controllers/productController.ts`, para que sejam reutilizáveis
 * pelos use cases independentemente da camada HTTP.
 */
class ProductEntity extends Entity {
  /**
   * @param {Object} props - Propriedades do produto.
   * @param {number} [props.id] - Identificador único.
   * @param {string} props.name - Nome do produto.
   * @param {string} props.code - Código único do produto.
   * @param {string} [props.description] - Descrição livre.
   * @param {number} [props.category_id] - FK da categoria.
   * @param {number} props.price - Preço de venda.
   * @param {number} [props.cost_price=0] - Preço de custo.
   * @param {number} [props.quantity=0] - Quantidade em estoque.
   * @param {number} [props.min_quantity=5] - Quantidade mínima (ponto de reposição).
   * @param {string} [props.status='active'] - `active` | `inactive`.
   * @param {string} [props.location] - Localização física no estoque.
   * @param {string} [props.product_type='finished'] - `finished` | `semi_finished` | `component` | `raw_material`.
   * @param {string} [props.ncm] - Código NCM.
   * @param {string} [props.cest] - Código CEST.
   * @param {number} [props.weight] - Peso em kg.
   * @param {string} [props.unit] - Unidade de medida (ex.: "un").
   * @param {number} [props.lead_time] - Prazo de produção/compra em dias.
   * @param {string} [props.drawing_number] - Número do desenho técnico.
   * @param {string} [props.revision='00'] - Revisão técnica atual.
   * @param {Object} [props.tsParams] - Parâmetros Thiele-Small (ver {@link ThieleSmallParams}).
   * @param {Date|string} [props.createdAt]
   * @param {Date|string} [props.updatedAt]
   * @throws {ValidationError} Se alguma regra de validação de campo for violada.
   */
  constructor(props) {
    super({ id: props.id, createdAt: props.createdAt, updatedAt: props.updatedAt });

    this.name = props.name;
    this.code = props.code;
    this.description = props.description ?? '';
    this.category_id = props.category_id ?? null;
    this.price = props.price !== undefined ? Number(props.price) : 0;
    this.cost_price = props.cost_price !== undefined ? Number(props.cost_price) : 0;
    this.quantity = props.quantity !== undefined ? Number(props.quantity) : 0;
    this.min_quantity = props.min_quantity !== undefined ? Number(props.min_quantity) : 5;
    this.status = props.status || 'active';
    this.location = props.location ?? '';
    this.product_type = props.product_type || 'finished';
    this.ncm = props.ncm || '85182100';
    this.cest = props.cest ?? null;
    this.weight = props.weight !== undefined && props.weight !== null ? Number(props.weight) : 0;
    this.unit = props.unit || 'un';
    this.lead_time = props.lead_time ?? 0;
    this.drawing_number = props.drawing_number ?? null;
    this.revision = props.revision || '00';
    this.tsParams = new ThieleSmallParams(props.tsParams || {});

    this.validate();
  }

  /**
   * Executa todas as validações de campo da entidade.
   *
   * @returns {void}
   * @throws {ValidationError} Se algum campo obrigatório estiver ausente ou fora do formato esperado.
   */
  validate() {
    if (!this.code || String(this.code).trim() === '') {
      throw new ValidationError('Código do produto é obrigatório.');
    }
    if (!this.name || String(this.name).trim() === '') {
      throw new ValidationError('Nome do produto é obrigatório.');
    }
    if (!PRODUCT_TYPES.includes(this.product_type)) {
      throw new ValidationError(`Tipo de produto inválido. Valores aceitos: ${PRODUCT_TYPES.join(', ')}.`);
    }
    if (!PRODUCT_STATUSES.includes(this.status)) {
      throw new ValidationError(`Status inválido. Valores aceitos: ${PRODUCT_STATUSES.join(', ')}.`);
    }
    if (this.price === undefined || this.price === null || Number.isNaN(this.price)) {
      throw new ValidationError('Preço é obrigatório.');
    }
    if (this.price < 0) {
      throw new ValidationError('Preço não pode ser negativo.');
    }
    if (this.cost_price > 0 && this.price <= this.cost_price) {
      throw new ValidationError('Preço de venda deve ser maior que o preço de custo.');
    }
    if (this.weight !== undefined && this.weight !== null && this.weight < 0) {
      throw new ValidationError('Peso não pode ser negativo.');
    }
  }

  /**
   * Aplica uma revisão técnica ao produto, validando que a nova revisão seja
   * diferente da atual.
   *
   * @param {string} newRevision - Nova revisão técnica (ex.: "01").
   * @returns {{ oldRevision: string, newRevision: string }} Par de revisões, útil para auditoria.
   * @throws {ValidationError} Se `newRevision` for vazia ou igual à atual.
   */
  applyRevision(newRevision) {
    if (!newRevision || String(newRevision).trim() === '') {
      throw new ValidationError('Nova revisão é obrigatória.');
    }
    if (newRevision === this.revision) {
      throw new ValidationError('A nova revisão deve ser diferente da revisão atual.');
    }
    const oldRevision = this.revision;
    this.revision = newRevision;
    return { oldRevision, newRevision };
  }

  /**
   * Altera o status do produto, aplicando a regra de que produtos não podem
   * ser inativados caso a checagem externa de vendas ativas (feita pelo use
   * case, via `Sale` model) indique impedimento. Esta entidade apenas garante
   * que o valor de status seja válido; a regra de vendas ativas é
   * responsabilidade do {@link DeactivateProductUseCase}.
   *
   * @param {string} newStatus - `active` | `inactive`.
   * @returns {void}
   * @throws {ValidationError} Se `newStatus` não for um valor suportado.
   */
  changeStatus(newStatus) {
    if (!PRODUCT_STATUSES.includes(newStatus)) {
      throw new ValidationError(`Status inválido. Valores aceitos: ${PRODUCT_STATUSES.join(', ')}.`);
    }
    this.status = newStatus;
  }

  /**
   * Verifica se o produto pode ser considerado com estoque baixo.
   *
   * @returns {boolean} `true` se `quantity <= min_quantity`.
   */
  isLowStock() {
    return this.quantity <= this.min_quantity;
  }

  /**
   * Serializa a entidade para um objeto plano compatível com os atributos do
   * model Sequelize `Product` (incluindo colunas `ts_params_*`).
   *
   * @returns {Object} Objeto plano pronto para `Product.create`/`Product.update`.
   */
  toPersistence() {
    return {
      name: this.name,
      code: this.code,
      description: this.description,
      category_id: this.category_id,
      price: this.price,
      cost_price: this.cost_price,
      quantity: this.quantity,
      min_quantity: this.min_quantity,
      status: this.status,
      location: this.location,
      product_type: this.product_type,
      ncm: this.ncm,
      cest: this.cest,
      weight: this.weight,
      unit: this.unit,
      lead_time: this.lead_time,
      drawing_number: this.drawing_number,
      revision: this.revision,
      ...this.tsParams.toPersistence()
    };
  }
}

module.exports = ProductEntity;
module.exports.PRODUCT_TYPES = PRODUCT_TYPES;
module.exports.PRODUCT_STATUSES = PRODUCT_STATUSES;


