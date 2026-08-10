const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, BusinessRuleError } = require('../../../../errors');
import type { IBOMRepository } from '../../domain/repositories/BOMRepository';

/**
 * Aprova uma BOM (transição para `active`), deixando-a como a **única**
 * estrutura vigente do produto.
 *
 * ## O que mudou no G1 (2026-08-10)
 *
 * Antes esta aprovação era um `UPDATE status='active'` isolado. Aprovar uma
 * segunda BOM do mesmo produto deixava **duas ativas**, e a partir daí
 * `BillOfMaterial.findOne({ product_id, status: 'active' })` — usada pela
 * explosão, pela reserva na liberação da OP e pelo custeio na conclusão —
 * devolvia uma revisão arbitrária. Ou seja: o próprio módulo de BOM
 * conseguia recriar, entre duas revisões, o mesmo descasamento
 * planejamento × consumo que o G1 fecha entre as duas árvores.
 *
 * Agora a aprovação rebaixa a vigente anterior para `superseded` na MESMA
 * transação, com os componentes dela intactos — mesmo ciclo de revisão que
 * o G5 aplicou ao roteiro de manufatura (ISO 9001 §8.5.6).
 */
class ApproveBOMUseCase extends UseCase {
  private bomRepository: IBOMRepository;

  /** @param {IBOMRepository} bomRepository */
  constructor(bomRepository: IBOMRepository) {
    super();
    this.bomRepository = bomRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id da BOM a aprovar.
   * @returns {Promise<{ before: Object, bom: Object, supersededIds: number[] }>}
   * @throws {NotFoundError} Se a BOM não existir.
   * @throws {BusinessRuleError} `G1-BOM-SUPERSEDED-IMUTAVEL` se a BOM já tiver
   *   sido substituída por uma revisão mais nova.
   */
  async execute({ id }: { id: number }) {
    const before = await this.bomRepository.findRawById(id);
    if (!before) {
      throw new NotFoundError('BOM não encontrada');
    }

    if (before.status === 'superseded') {
      throw new BusinessRuleError(
        `A BOM #${before.id} foi substituída por uma revisão mais nova e não pode ser reativada. `
        + 'Reativá-la faria a fábrica voltar a consumir uma estrutura que a engenharia já aposentou. '
        + 'Crie uma revisão nova a partir dela.',
        { rule: 'G1-BOM-SUPERSEDED-IMUTAVEL', bomId: before.id, productId: before.product_id },
      );
    }

    const { updated, supersededIds } = await this.bomRepository.activateExclusively(
      Number(before.id),
      Number(before.product_id),
      {},
    );
    if (!updated) {
      throw new NotFoundError('BOM não encontrada');
    }

    const bom = await this.bomRepository.findById(id);

    return { before, bom, supersededIds: supersededIds ?? [] };
  }
}

module.exports = ApproveBOMUseCase;
