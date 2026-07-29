const Entity = require('../../../../shared/domain/Entity');
const { ValidationError } = require('../../../../errors');

/** Tipos de contagem suportados (mesmo ENUM do model Sequelize `InventoryCount.count_type`). */
const COUNT_TYPES = ['cycle', 'full', 'spot'];

/** Status suportados (mesmo ENUM do model Sequelize `InventoryCount.status`). */
const COUNT_STATUSES = ['draft', 'counting', 'pending_approval', 'approved', 'rejected', 'adjusted'];

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
   * @param {string} [props.location] - Local/área física contada.
   * @param {string} [props.notes] - Observações gerais.
   * @param {number} props.created_by - Id do usuário que criou a contagem.
   * @throws {ValidationError} Se `count_type` for inválido ou `created_by` estiver ausente.
   */
  constructor(props) {
    super({ id: props.id, createdAt: props.createdAt, updatedAt: props.updatedAt });

    this.count_type = props.count_type || 'cycle';
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
  }

  /**
   * Serializa a entidade para os parâmetros aceitos por `InventoryCountRepository.create`.
   *
   * @returns {{ count_type: string, location: string|null, notes: string|null, created_by: number, status: 'draft' }}
   */
  toRepositoryInput() {
    return {
      count_type: this.count_type,
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


