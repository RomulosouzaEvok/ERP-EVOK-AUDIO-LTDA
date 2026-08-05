const Entity = require('../../../../shared/domain/Entity');
const { ValidationError } = require('../../../../errors');

/** Tipos de contagem suportados (mesmo ENUM do model Sequelize `InventoryCount.count_type`). */
const COUNT_TYPES = ['cycle', 'full', 'spot'];

/** Status suportados (mesmo ENUM do model Sequelize `InventoryCount.status`). */
const COUNT_STATUSES = ['draft', 'counting', 'pending_approval', 'approved', 'rejected', 'adjusted'];

/** Propriedades aceitas pelo construtor de `InventoryCountEntity`. */
interface InventoryCountEntityProps {
  id?: number | string;
  count_type?: 'cycle' | 'full' | 'spot';
  warehouse_id: number;
  location?: string | null;
  notes?: string | null;
  created_by: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/**
 * Entidade de domínio leve que representa o cabeçalho de uma contagem de
 * inventário cíclico. Valida apenas a FORMA dos dados de entrada
 * (`count_type`, `location`) antes de a operação ser deanterior ao
 * repositório/`InventoryService`.
 */
class InventoryCountEntity extends Entity {
  /**
   * @param {Object} props - Propriedades da contagem.
   * @param {number} [props.id]
   * @param {'cycle'|'full'|'spot'} [props.count_type] - Tipo de contagem (default `cycle`).
   * @param {number} props.warehouse_id - Id do depósito ao qual TODA a contagem pertence
   *   (obrigatório para contagens novas — Bloco 4, migration `20260804-000006`; a coluna é
   *   nullable no banco apenas por causa de 4 linhas legadas pré-Bloco 4, já backfilled).
   * @param {string} [props.location] - Local/área física contada.
   * @param {string} [props.notes] - Observações gerais.
   * @param {number} props.created_by - Id do usuário que criou a contagem.
   * @throws {ValidationError} Se `count_type` for inválido, `warehouse_id` ou `created_by` estiverem ausentes.
   */
  constructor(props: InventoryCountEntityProps) {
    super({ id: props.id, createdAt: props.createdAt, updatedAt: props.updatedAt });

    this.count_type = props.count_type || 'cycle';
    this.warehouse_id = props.warehouse_id;
    this.location = props.location ?? null;
    this.notes = props.notes ?? null;
    this.created_by = props.created_by;

    this.validate();
  }

  /**
   * Executa todas as validações de forma da entidade.
   *
   * @returns {void}
   * @throws {ValidationError} Se algum campo obrigatório estiver ausente ou inválido.
   */
  validate() {
    if (!COUNT_TYPES.includes(this.count_type)) {
      throw new ValidationError(`Tipo de contagem inválido. Valores aceitos: ${COUNT_TYPES.join(', ')}.`);
    }
    if (!this.created_by) {
      throw new ValidationError('Usuário responsável pela criação (created_by) é obrigatório.');
    }
    // Bloco 4 (migration 20260804-000006): warehouse_id é nullable no banco
    // apenas para preservar o histórico de 4 contagens legadas pré-Bloco 4.
    // Toda contagem NOVA deve obrigatoriamente informar o depósito contado.
    if (this.warehouse_id === undefined || this.warehouse_id === null || Number.isNaN(Number(this.warehouse_id))) {
      throw new ValidationError('Depósito (warehouse_id) é obrigatório para criar uma contagem de inventário.');
    }
  }

  /**
   * Serializa a entidade para os parâmetros aceitos por `InventoryCountRepository.create`.
   *
   * @returns {{ count_type: string, warehouse_id: number, location: string|null, notes: string|null, created_by: number, status: 'draft' }}
   */
  toRepositoryInput() {
    return {
      count_type: this.count_type,
      warehouse_id: Number(this.warehouse_id),
      location: this.location,
      notes: this.notes,
      created_by: this.created_by,
      status: 'draft'
    };
  }
}

module.exports = InventoryCountEntity;
module.exports.COUNT_TYPES = COUNT_TYPES;
module.exports.COUNT_STATUSES = COUNT_STATUSES;


