const Entity = require('../../../../shared/domain/Entity');
const { ValidationError } = require('../../../../errors');

/** Tipos de movimentação suportados (mesmo ENUM do model Sequelize `InventoryMovement.type`). */
const MOVEMENT_TYPES = ['in', 'out', 'adjustment'];

/** Origens suportadas (mesmo ENUM do model Sequelize `InventoryMovement.reference_type`). */
const REFERENCE_TYPES = ['sale', 'purchase', 'production', 'adjustment', 'transfer', 'sst_epi_delivery', 'import'];

/** Propriedades aceitas pelo construtor de `InventoryMovementEntity`. */
interface InventoryMovementEntityProps {
  id?: number | string;
  product_id: number;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  description?: string | null;
  reference_id?: number | null;
  reference_type?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/**
 * Entidade de domínio leve que representa uma movimentação de estoque
 * (entrada, saída ou ajuste) de um produto.
 *
 * Esta entidade valida apenas a FORMA dos dados de entrada (tipo, produto,
 * quantidade, origem) antes de a operação ser deanterior ao
 * `InventoryService` (que concentra a lógica transacional de lock
 * pessimista e persistência — não duplicada aqui).
 */
class InventoryMovementEntity extends Entity {
  /**
   * @param {Object} props - Propriedades da movimentação.
   * @param {number} [props.id] - Identificador único (quando já persistida).
   * @param {number} props.product_id - Id do produto movimentado.
   * @param {'in'|'out'|'adjustment'} props.type - Tipo de movimentação.
   * @param {number} props.quantity - Quantidade movimentada (deve ser > 0).
   * @param {string} [props.description] - Descrição/motivo da movimentação.
   * @param {number} [props.reference_id] - Id da entidade de origem (venda, compra, OP, etc.).
   * @param {string} [props.reference_type] - Tipo de origem (`sale`, `purchase`, `production`, `adjustment`, `transfer`).
   * @param {Date|string} [props.createdAt]
   * @param {Date|string} [props.updatedAt]
   * @throws {ValidationError} Se algum campo obrigatório estiver ausente ou fora do formato esperado.
   */
  constructor(props: InventoryMovementEntityProps) {
    super({ id: props.id, createdAt: props.createdAt, updatedAt: props.updatedAt });

    this.product_id = props.product_id;
    this.type = props.type;
    this.quantity = props.quantity !== undefined ? Number(props.quantity) : undefined;
    this.description = props.description ?? null;
    this.reference_id = props.reference_id ?? null;
    this.reference_type = props.reference_type ?? null;

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
      throw new ValidationError('Produto é obrigatório.');
    }
    if (!this.type || !MOVEMENT_TYPES.includes(this.type)) {
      throw new ValidationError(`Tipo de movimentação inválido. Valores aceitos: ${MOVEMENT_TYPES.join(', ')}.`);
    }
    if (this.quantity === undefined || Number.isNaN(this.quantity)) {
      throw new ValidationError('Quantidade é obrigatória e deve ser numérica.');
    }
    if (this.quantity <= 0) {
      throw new ValidationError('Quantidade deve ser um número maior que zero.');
    }
    if (this.reference_type && !REFERENCE_TYPES.includes(this.reference_type)) {
      throw new ValidationError(`Origem (reference_type) inválida. Valores aceitos: ${REFERENCE_TYPES.join(', ')}.`);
    }
  }

  /**
   * Serializa a entidade para os parâmetros aceitos por `InventoryService.adjust`.
   *
   * @returns {{ product_id: number, type: string, quantity: number, description: string|null, reference_id: number|null, reference_type: string|null }}
   */
  toServiceInput() {
    return {
      product_id: this.product_id,
      type: this.type,
      quantity: this.quantity,
      description: this.description,
      reference_id: this.reference_id,
      reference_type: this.reference_type
    };
  }
}

module.exports = InventoryMovementEntity;
module.exports.MOVEMENT_TYPES = MOVEMENT_TYPES;
module.exports.REFERENCE_TYPES = REFERENCE_TYPES;


