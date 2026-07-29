const UseCase = require('../../../../shared/application/UseCase');
const InventoryService = require('../../../../services/inventoryService');
const CostingService = require('../../../../services/costingService');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../../../../errors');

/**
 * Registra o recebimento (total ou parcial) dos itens de um pedido de
 * compra, cobrindo o fluxo do endpoint `POST /api/purchases/:id/receive`.
 *
 * Toda a atualização real de estoque (lock pessimista + `InventoryMovement`)
 * continua 100% deanterior a `InventoryService.receive` (mesma
 * `server/src/services/inventoryService.ts` usada pelo controller anterior),
 * dentro da mesma transação recebida do controller — não duplicada aqui.
 */
class ReceivePurchaseItemsUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/PurchaseRepository')} purchaseRepository
   */
  constructor(purchaseRepository) {
    super();
    this.purchaseRepository = purchaseRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id do pedido de compra.
   * @param {Array<{item_id:number, quantity:number}>} input.items - Itens recebidos.
   * @param {number} input.userId - Id do usuário que realiza o recebimento.
   * @param {import('sequelize').Transaction} input.transaction - Transação Sequelize ativa (criada pelo controller).
   * @returns {Promise<{ purchase: Object, previousStatus: string }>}
   * @throws {NotFoundError} Se o pedido ou algum item referenciado não existir.
   * @throws {ValidationError} Se a lista de itens for inválida ou alguma quantidade for inválida.
   * @throws {BusinessRuleError} Se o pedido não estiver `sent`/`partial`, ou a quantidade recebida exceder o máximo pendente.
   */
  async execute({ id, items, userId, transaction }) {
    const purchase = await this.purchaseRepository.findPurchaseWithItems(id, transaction);
    if (!purchase) {
      throw new NotFoundError('Pedido não encontrado');
    }
    if (!['sent', 'partial'].includes(purchase.status)) {
      throw new BusinessRuleError('Apenas pedidos enviados ou com recebimento parcial podem ser recebidos');
    }
    if (!items || items.length === 0) {
      throw new ValidationError('Lista de itens é obrigatória');
    }

    const previousStatus = purchase.status;

    for (const received of items) {
      if (!received.item_id || received.quantity === undefined) {
        throw new ValidationError('Cada item deve ter item_id e quantity');
      }
      const qty = parseFloat(received.quantity);
      if (Number.isNaN(qty) || qty <= 0) {
        throw new ValidationError('Quantidade deve ser maior que zero');
      }

      const item = purchase.items.find((i) => i.id === parseInt(received.item_id, 10));
      if (!item) {
        throw new ValidationError(`Item ${received.item_id} não encontrado`);
      }

      const currentReceived = parseFloat(item.received_quantity) || 0;
      const maxReceivable = parseFloat(item.quantity) - currentReceived;
      if (qty > maxReceivable) {
        throw new BusinessRuleError(`Quantidade excedente. Máximo: ${maxReceivable}`);
      }

      const newReceived = currentReceived + qty;
      const itemStatus = newReceived >= parseFloat(item.quantity) ? 'received' : 'partial';
      await this.purchaseRepository.updatePurchaseItem(item.id, { received_quantity: newReceived, status: itemStatus }, transaction);

      // InventoryService faz o lock da linha do Product e registra o
      // InventoryMovement atomicamente na mesma transação. Recebimento
      // duplicado/excedente já é bloqueado acima pelo check de maxReceivable
      // contra received_quantity.
      const unitCost = parseFloat(item.unit_price || 0);
      const { product } = await InventoryService.receive(item.product_id, qty, transaction, {
        user_id: userId,
        description: `Recebimento PO ${purchase.order_number}`,
        reference_id: purchase.id,
        reference_type: 'purchase',
        unit_cost: unitCost
      });

      await CostingService.registerWeightedAverageCost({
        product,
        quantity: qty,
        unitCost,
        sourceType: 'purchase',
        sourceId: purchase.id,
        userId,
        notes: `Custo real de compra - PO ${purchase.order_number}`
      }, transaction);
    }

    const updatedItems = await this.purchaseRepository.findPurchaseItems(purchase.id, transaction);
    const allReceived = updatedItems.every((i) => i.status === 'received');
    purchase.status = allReceived ? 'received' : 'partial';
    await purchase.save({ transaction });

    return { purchase, previousStatus };
  }
}

module.exports = ReceivePurchaseItemsUseCase;


