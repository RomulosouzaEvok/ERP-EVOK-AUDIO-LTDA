const UseCase = require('../../../../shared/application/UseCase');
const InventoryService = require('../../../../services/inventoryService');
const CostingService = require('../../../../services/costingService');
const { LotControl } = require('../../../../models/index');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../../../../errors');

function buildGeneratedLotNumber({ orderNumber, purchaseItemId, sequence }) {
  return `${orderNumber}-ITEM${purchaseItemId}-R${String(sequence).padStart(3, '0')}`;
}

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
   * @param {number} input.id
   * @param {Array<{item_id:number, quantity:number}>} input.items
   * @param {number} input.userId
   * @param {import('sequelize').Transaction} input.transaction
   * @returns {Promise<{ purchase: Object, previousStatus: string }>}
   */
  async execute({ id, items, userId, transaction }) {
    const purchase = await this.purchaseRepository.findPurchaseWithItemsForUpdate(id, transaction);
    if (!purchase) {
      throw new NotFoundError('Pedido nao encontrado');
    }
    if (!['sent', 'partial'].includes(purchase.status)) {
      throw new BusinessRuleError('Apenas pedidos enviados ou com recebimento parcial podem ser recebidos');
    }
    if (!items || items.length === 0) {
      throw new ValidationError('Lista de itens e obrigatoria');
    }

    const previousStatus = purchase.status;
    let generatedLotSequence = 0;

    for (const received of items) {
      if (!received.item_id || received.quantity === undefined) {
        throw new ValidationError('Cada item deve ter item_id e quantity');
      }
      const qty = parseFloat(received.quantity);
      if (Number.isNaN(qty) || qty <= 0) {
        throw new ValidationError('Quantidade deve ser maior que zero');
      }

      const item = purchase.items.find((candidate) => candidate.id === parseInt(received.item_id, 10));
      if (!item) {
        throw new ValidationError(`Item ${received.item_id} nao encontrado`);
      }

      const currentReceived = parseFloat(item.received_quantity) || 0;
      const maxReceivable = parseFloat(item.quantity) - currentReceived;
      if (qty > maxReceivable) {
        throw new BusinessRuleError(`Quantidade excedente. Maximo: ${maxReceivable}`);
      }

      const newReceived = currentReceived + qty;
      const itemStatus = newReceived >= parseFloat(item.quantity) ? 'received' : 'partial';
      await this.purchaseRepository.updatePurchaseItem(item.id, { received_quantity: newReceived, status: itemStatus }, transaction);

      const unitCost = parseFloat(item.unit_price || 0);
      const { product } = await InventoryService.receive(item.product_id, qty, userId, transaction, {
        description: `Recebimento PO ${purchase.order_number}`,
        referenceId: purchase.id,
        referenceType: 'purchase'
      });

      const providedLotNumber = received.lot_number ? String(received.lot_number).trim() : '';
      generatedLotSequence += 1;
      const lotNumber = providedLotNumber || buildGeneratedLotNumber({
        orderNumber: purchase.order_number,
        purchaseItemId: item.id,
        sequence: generatedLotSequence
      });

      const existingLot = await LotControl.findOne({
        where: {
          product_id: item.product_id,
          purchase_id: purchase.id,
          lot_number: lotNumber
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (existingLot) {
        const nextInitial = parseFloat(existingLot.quantity_initial || 0) + qty;
        const nextAvailable = parseFloat(existingLot.quantity_available || 0) + qty;
        await existingLot.update({
          supplier_id: purchase.supplier_id,
          status: 'available',
          quantity_initial: nextInitial,
          quantity_available: nextAvailable,
          received_at: received.received_at || purchase.delivery_date || purchase.invoice_date || new Date(),
          manufactured_at: received.manufactured_at || existingLot.manufactured_at || null,
          expires_at: received.expires_at || existingLot.expires_at || null,
          created_by: userId,
          notes: received.lot_notes || existingLot.notes || `Recebimento PO ${purchase.order_number}`
        }, { transaction });
      } else {
        await LotControl.create({
          product_id: item.product_id,
          supplier_id: purchase.supplier_id,
          purchase_id: purchase.id,
          lot_number: lotNumber,
          status: 'available',
          quantity_initial: qty,
          quantity_available: qty,
          received_at: received.received_at || purchase.delivery_date || purchase.invoice_date || new Date(),
          manufactured_at: received.manufactured_at || null,
          expires_at: received.expires_at || null,
          created_by: userId,
          notes: received.lot_notes || `Recebimento PO ${purchase.order_number}`
        }, { transaction });
      }

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

    const updatedItems = await this.purchaseRepository.findPurchaseItemsForUpdate(purchase.id, transaction);
    const allReceived = updatedItems.every((item) => item.status === 'received');
    purchase.status = allReceived ? 'received' : 'partial';
    await purchase.save({ transaction });

    return { purchase, previousStatus };
  }
}

module.exports = ReceivePurchaseItemsUseCase;
