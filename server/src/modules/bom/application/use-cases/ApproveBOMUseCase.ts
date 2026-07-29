const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');

/**
 * Aprova uma BOM (transição de status para `active`), cobrindo o caso
 * "isApproval" de `PUT /api/engineering/bom/:id` — mesma operação de
 * `UpdateBOMUseCase`, isolada em use case próprio conforme pedido pelo
 * `TODO.md` (Fase 6), para deixar explícita a intenção de negócio
 * "aprovação" e o log de auditoria com `action: 'approve'`.
 *
 * Não há regra de negócio adicional aqui além da já existente na
 * atualização genérica de campos da BOM (o schema/model não impõe
 * workflow de aprovação formal hoje); a distinção é de intenção e de
 * auditoria, replicando o comportamento hoje inline no controller anterior.
 */
class ApproveBOMUseCase extends UseCase {
  /** @param {import('../../domain/repositories/BOMRepository')} bomRepository */
  constructor(bomRepository) {
    super();
    this.bomRepository = bomRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id da BOM a aprovar.
   * @returns {Promise<{ before: Object, bom: Object }>}
   * @throws {NotFoundError} Se a BOM não existir.
   */
  async execute({ id }) {
    const before = await this.bomRepository.findRawById(id);
    if (!before) {
      throw new NotFoundError('BOM não encontrada');
    }

    const updated = await this.bomRepository.update(id, { status: 'active' });
    if (!updated) {
      throw new NotFoundError('BOM não encontrada');
    }

    const bom = await this.bomRepository.findById(id);

    return { before, bom };
  }
}

module.exports = ApproveBOMUseCase;


