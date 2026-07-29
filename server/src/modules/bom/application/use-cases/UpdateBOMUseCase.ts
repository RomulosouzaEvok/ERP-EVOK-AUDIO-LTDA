const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');

/** Campos gerais da BOM que podem ser alterados via `PUT /:id` (mesmos do controller anterior). */
const ALLOWED_FIELDS = ['revision', 'revision_notes', 'notes', 'status'];

/**
 * Atualiza campos gerais de uma BOM (não os itens — para alterar itens,
 * criar uma nova revisão via `CreateBOMUseCase`), cobrindo
 * `PUT /api/engineering/bom/:id` para o caso genérico (não-aprovação).
 *
 * A detecção de "isApproval" (quando `status` muda para `active`) é feita
 * no controller, que delega para `ApproveBOMUseCase` nesse caso e para este
 * use case nos demais — preservando a mesma lógica de auditoria hoje
 * inline no `bomController.update` anterior, agora explicitada em dois use
 * cases dedicados.
 */
class UpdateBOMUseCase extends UseCase {
  /** @param {import('../../domain/repositories/BOMRepository')} bomRepository */
  constructor(bomRepository) {
    super();
    this.bomRepository = bomRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id da BOM.
   * @param {Object} input.data - Campos a atualizar (subconjunto de `ALLOWED_FIELDS`).
   * @returns {Promise<{ before: Object, updateData: Object, bom: Object }>}
   * @throws {NotFoundError} Se a BOM não existir.
   */
  async execute({ id, data }) {
    const updateData: any = {};
    for (const field of ALLOWED_FIELDS) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    const before = await this.bomRepository.findRawById(id);
    if (!before) {
      throw new NotFoundError('BOM não encontrada');
    }

    const updated = await this.bomRepository.update(id, updateData);
    if (!updated) {
      throw new NotFoundError('BOM não encontrada');
    }

    const bom = await this.bomRepository.findById(id);

    return { before, updateData, bom };
  }
}

module.exports = UpdateBOMUseCase;



