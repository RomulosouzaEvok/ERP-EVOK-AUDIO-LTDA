const UseCase = require('../../../../shared/application/UseCase');
const InventoryMovementEntity = require('../../domain/entities/InventoryMovementEntity');
const InventoryService = require('../../../../services/inventoryService');

/**
 * Registra uma movimentação de estoque (entrada/saída/ajuste manual),
 * cobrindo o fluxo do endpoint `POST /api/inventory/movements`.
 *
 * Este use case é um wrapper fino: a `InventoryMovementEntity` valida a
 * FORMA dos dados de entrada, e toda a lógica transacional (lock
 * pessimista, validação de estoque disponível, persistência atômica do
 * `InventoryMovement`) permanece 100% em
 * `server/src/services/inventoryService.ts` (`InventoryService.adjust`),
 * conforme já implementado na Fase 4.1 — não duplicada aqui.
 */
class CreateInventoryMovementUseCase extends UseCase {
  /**
   * @param {Object} input
   * @param {number} input.product_id
   * @param {'in'|'out'|'adjustment'} input.type
   * @param {number} input.quantity
   * @param {string} [input.description]
   * @param {number} [input.reference_id]
   * @param {string} [input.reference_type]
   * @param {number} input.userId - Id do usuário que realizou a movimentação.
   * @param {import('sequelize').Transaction} input.transaction - Transação Sequelize ativa (criada pelo controller).
   * @returns {Promise<{ product: Object, movement: Object }>}
   * @throws {import('../../../../errors').ValidationError} Se os dados de entrada forem inválidos.
   * @throws {Error} Com `statusCode` 404/400/409 propagado por `InventoryService.adjust` (produto não encontrado, estoque insuficiente, etc.).
   */
  async execute({ product_id, type, quantity, description, reference_id, reference_type, userId, transaction }) {
    const entity = new InventoryMovementEntity({
      product_id, type, quantity, description, reference_id, reference_type
    });
    const input = entity.toServiceInput();

    return InventoryService.adjust(
      input.product_id,
      input.type,
      input.quantity,
      userId,
      input.description,
      transaction,
    );
  }
}

module.exports = CreateInventoryMovementUseCase;


