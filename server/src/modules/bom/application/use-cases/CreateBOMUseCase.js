const UseCase = require('../../../../shared/application/UseCase');
const BOMEntity = require('../../domain/entities/BOMEntity');
const BomService = require('../../../../services/bomService');

/**
 * Cria uma nova BOM para um produto com seus itens componentes, cobrindo
 * `POST /api/engineering/bom`.
 *
 * Wrapper fino: `BOMEntity` valida a FORMA dos dados de entrada, e toda a
 * lógica de negócio (produto deve ser `finished`, componentes devem
 * existir, versionamento automático — as BOMs ativas anteriores do produto
 * são marcadas como `superseded` — cálculo de custo por item, criação
 * transacional) permanece 100% em `BomService.createBOM`.
 *
 * Por já cuidar do versionamento automático (supersede) internamente, este
 * use case cobre também o papel do `SupersedeBOMUseCase` previsto no
 * `TODO.md`; não há um endpoint HTTP separado para "supersede manual" hoje
 * — ver decisão documentada no README do módulo.
 */
class CreateBOMUseCase extends UseCase {
  /**
   * @param {Object} input
   * @param {number} input.product_id
   * @param {Array<Object>} input.items
   * @param {string} [input.revision]
   * @param {string} [input.revision_notes]
   * @param {string} [input.notes]
   * @param {number} input.userId - Id do usuário criador.
   * @returns {Promise<{ bom: Object, items: Object[] }>}
   * @throws {import('../../../../errors').ValidationError} Se os dados de entrada forem inválidos.
   * @throws {Error} Com `statusCode` 404/400 propagado por `BomService.createBOM`
   * (produto/componente não encontrado, produto não é `finished`, etc.).
   */
  async execute({ product_id, items, revision, revision_notes, notes, userId }) {
    const entity = new BOMEntity({ product_id, items, revision, revision_notes, notes });
    const input = entity.toServiceInput(userId);

    return BomService.createBOM(input);
  }
}

module.exports = CreateBOMUseCase;
