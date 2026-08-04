const UseCase = require('../../../../shared/application/UseCase');
const InventoryMovementEntity = require('../../domain/entities/InventoryMovementEntity');
const InventoryService = require('../../../../services/inventoryService');
const WarehouseStockService = require('../../../../services/warehouseStockService');

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
   * @param {string} [input.warehouse_code] - Codigo do deposito onde a movimentacao ocorre (Bloco 4, UC-42). Default 'INSUMOS'.
   * @param {number} input.userId - Id do usuário que realizou a movimentação.
   * @param {import('sequelize').Transaction} input.transaction - Transação Sequelize ativa (criada pelo controller).
   * @returns {Promise<{ product: Object, movement: Object }>}
   * @throws {import('../../../../errors').ValidationError} Se os dados de entrada forem inválidos.
   * @throws {Error} Com `statusCode` 404/400/409 propagado por `InventoryService.adjust` (produto não encontrado, estoque insuficiente, etc.).
   * @throws {import('../../../../errors').BusinessRuleError} Se o saldo do depósito for insuficiente para uma saída manual (dual-write).
   */
  async execute({ product_id, type, quantity, description, reference_id, reference_type, warehouse_code, userId, transaction }) {
    const entity = new InventoryMovementEntity({
      product_id, type, quantity, description, reference_id, reference_type
    });
    const input = entity.toServiceInput();

    const warehouse = await WarehouseStockService.getWarehouseByCode(warehouse_code || 'INSUMOS', transaction);

    // Dual-write (BUSINESS_RULES.md §12 item 3): saida manual so e aceita
    // se o deposito informado tiver saldo suficiente do produto (422
    // didatico em removeFromWarehouse), garantindo que products.quantity
    // e o saldo por deposito nunca divirjam.
    if (input.type === 'out') {
      await WarehouseStockService.removeFromWarehouse(input.product_id, warehouse.id, input.quantity, transaction);
    }

    const result = await InventoryService.adjust(
      input.product_id,
      input.type,
      input.quantity,
      userId,
      input.description,
      transaction,
      warehouse.id
    );

    if (input.type === 'in') {
      await WarehouseStockService.addToWarehouse(input.product_id, warehouse.id, input.quantity, transaction);
    }

    return result;
  }
}

module.exports = CreateInventoryMovementUseCase;


