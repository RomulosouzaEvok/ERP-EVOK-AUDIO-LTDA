import type { Transaction } from 'sequelize';

import UseCase from '../../../../shared/application/UseCase';

const InventoryMovementEntity = require('../../domain/entities/InventoryMovementEntity');
const InventoryService = require('../../../../services/inventoryService');
const WarehouseStockService = require('../../../../services/warehouseStockService');
const SequelizeItemRepository = require('../../../items/infrastructure/sequelize/SequelizeItemRepository');
const { BusinessRuleError } = require('../../../../errors');

const itemRepository = new SequelizeItemRepository();

/** Dados de entrada de `CreateInventoryMovementUseCase.execute`. */
interface CreateInventoryMovementInput {
  /** Id do produto legado (`products.id`). Alternativa a `item_id` — exatamente um dos dois é aceito (validado em `inventoryValidators.ts`). */
  product_id?: number;
  /**
   * Id (UUID) do `Item` novo (dual-read, PREFERIDO). Quando informado, é
   * resolvido para o `Product` legado correspondente via
   * `ItemRepository.findLegacyProductByItemId` (crosswalk por
   * `items.codigo === products.code`, mesmo padrão já usado por
   * `ConvertPlannedOrdersToProductionOrderUseCase` no módulo MRP) ANTES de
   * chamar `InventoryService.adjust` — que permanece 100% acoplado a
   * `Product`. Se não houver produto legado correspondente, a movimentação
   * é rejeitada com `BusinessRuleError` (422): não existe caminho de
   * estoque paralelo para itens novos sem vínculo legado.
   */
  item_id?: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  description?: string;
  reference_id?: number;
  reference_type?: string;
  /** Codigo do deposito onde a movimentacao ocorre (Bloco 4, UC-42). Default 'INSUMOS'. */
  warehouse_code?: string;
  /** Id do usuário que realizou a movimentação. */
  userId: number;
  /** Transação Sequelize ativa (criada pelo controller). */
  transaction: Transaction;
}

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
   * @param {number} [input.product_id] - Id do produto legado. Alternativa a `item_id` (exatamente um dos dois, validado a montante).
   * @param {string} [input.item_id] - Id (UUID) do item novo (dual-read, PREFERIDO). Resolvido para `product_id` via crosswalk por código antes de seguir.
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
   * @throws {import('../../../../errors').BusinessRuleError} Se o saldo do depósito for insuficiente para uma saída manual (dual-write), OU se `item_id` foi informado mas não existe `Product` legado correspondente (crosswalk por código) — itens novos sem vínculo legado ainda não têm caminho de estoque manual próprio.
   */
  async execute({ product_id, item_id, type, quantity, description, reference_id, reference_type, warehouse_code, userId, transaction }: CreateInventoryMovementInput) {
    let resolvedProductId = product_id;

    // DUAL-READ: `item_id` (novo, UUID) resolvido para o `Product` legado
    // correspondente via crosswalk por código (mesmo padrão já usado por
    // `ConvertPlannedOrdersToProductionOrderUseCase`, módulo MRP) — o
    // restante do fluxo (lock pessimista, saldo por depósito,
    // `InventoryService.adjust`) permanece 100% acoplado a `Product`, sem
    // caminho de estoque paralelo.
    if (item_id) {
      const legacyProduct = await itemRepository.findLegacyProductByItemId(item_id);
      if (!legacyProduct) {
        throw new BusinessRuleError(
          `Item ${item_id} não possui produto legado correspondente (crosswalk por código). ` +
          'Movimentação manual de estoque por item_id ainda não é suportada para itens sem vínculo legado.',
          { item_id }
        );
      }
      resolvedProductId = legacyProduct.id;
    }

    const entity = new InventoryMovementEntity({
      product_id: resolvedProductId, type, quantity, description, reference_id, reference_type
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
      warehouse.id,
      item_id ?? null,
      reference_id,
      reference_type as any
    );

    if (input.type === 'in') {
      await WarehouseStockService.addToWarehouse(input.product_id, warehouse.id, input.quantity, transaction);
    }

    return result;
  }
}

module.exports = CreateInventoryMovementUseCase;


