import type { Transaction } from 'sequelize';
import type PurchaseRepository = require('../../domain/repositories/PurchaseRepository');

const UseCase = require('../../../../shared/application/UseCase');
const InventoryService = require('../../../../services/inventoryService');
const WarehouseStockService = require('../../../../services/warehouseStockService');
const CostingService = require('../../../../services/costingService');
const { NotFoundError, ValidationError, BusinessRuleError, ConflictError } = require('../../../../errors');

const UNIQUE_VIOLATION = 'SequelizeUniqueConstraintError';

/** Origem de requisicao que direciona o recebimento para o Depósito do Laboratório por padrão (UC-39, Bloco 2, BUSINESS_RULES.md §9/§12 item 7). */
const ENGINEERING_SAMPLE_ORIGIN = 'engenharia_amostra';

interface GeneratedLotNumberInput {
  orderNumber: string;
  purchaseItemId: number | string;
  sequence: number;
}

function buildGeneratedLotNumber({ orderNumber, purchaseItemId, sequence }: GeneratedLotNumberInput) {
  return `${orderNumber}-ITEM${purchaseItemId}-R${String(sequence).padStart(3, '0')}`;
}

interface ReceivePurchaseItemsInput {
  id: number | string;
  items: Array<Record<string, any>>;
  invoiceNumber: string;
  warehouseCode?: 'INSUMOS' | 'LABORATORIO';
  userId: number;
  transaction: Transaction;
}

class ReceivePurchaseItemsUseCase extends UseCase {
  private purchaseRepository: PurchaseRepository;

  /**
   * @param {import('../../domain/repositories/PurchaseRepository')} purchaseRepository
   */
  constructor(purchaseRepository: PurchaseRepository) {
    super();
    this.purchaseRepository = purchaseRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id
   * @param {Array<{item_id:number, quantity:number}>} input.items
   * @param {string} input.invoiceNumber - Numero da NF do fornecedor deste recebimento (chave de deduplicacao).
   * @param {'INSUMOS'|'LABORATORIO'} [input.warehouseCode] - Deposito de destino (Bloco 4, UC-42 §12 item 7). Se omitido, o default e 'INSUMOS', EXCETO quando o pedido veio de uma requisicao com `origin='engenharia_amostra'` (Bloco 2, UC-39/§9), caso em que o default passa a ser 'LABORATORIO' automaticamente.
   * @param {number} input.userId
   * @param {import('sequelize').Transaction} input.transaction
   * @returns {Promise<{ purchase: Object, previousStatus: string }>}
   * @throws {ConflictError} Se esta NF (invoiceNumber) ja tiver sido registrada para este pedido.
   * @throws {ValidationError} Se invoiceNumber estiver ausente/vazio.
   *   `details: { purchase_id, order_number, field: 'invoice_number' }`.
   */
  async execute({ id, items, invoiceNumber, warehouseCode, userId, transaction }: ReceivePurchaseItemsInput) {
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
    if (!invoiceNumber || !String(invoiceNumber).trim()) {
      throw new ValidationError(
        'Numero da NF (invoice_number) e obrigatorio para registrar o recebimento.',
        { purchase_id: purchase.id, order_number: purchase.order_number, field: 'invoice_number' }
      );
    }

    // Constraint unica (purchase_id, invoice_number) no banco: garante,
    // mesmo sob concorrencia real, que a mesma NF nao seja lancada duas
    // vezes contra o mesmo pedido (cada lancamento de recebimento exige
    // uma NF diferente).
    try {
      await this.purchaseRepository.createPurchaseReceipt({
        purchase_id: purchase.id,
        invoice_number: String(invoiceNumber).trim(),
        received_by: userId,
        received_at: new Date(),
      }, transaction);
    } catch (error) {
      if (error instanceof Error && error.name === UNIQUE_VIOLATION) {
        throw new ConflictError(`NF ${invoiceNumber} ja foi registrada para o pedido ${purchase.order_number}.`);
      }
      throw error;
    }

    const previousStatus = purchase.status;
    let generatedLotSequence = 0;

    // Roteamento de deposito (Bloco 4, BUSINESS_RULES.md §12 item 7; Bloco 2,
    // UC-39/§9): quando o Recebimento informa `warehouseCode` explicitamente,
    // esse valor sempre prevalece. Quando NAO informa, o default deixa de
    // ser sempre 'INSUMOS': se o pedido tem `requisition_id` e a requisicao
    // de origem tem `origin='engenharia_amostra'`, o default passa a ser
    // 'LABORATORIO' automaticamente (sem exigir que o Recebimento saiba/
    // lembre de sinalizar manualmente a origem de amostra). Resolvido uma
    // unica vez para todo o recebimento.
    let defaultWarehouseCode = 'INSUMOS';
    if (!warehouseCode && purchase.requisition_id) {
      const requisition = await this.purchaseRepository.findRequisitionOriginById(purchase.requisition_id, transaction);
      if (requisition?.origin === ENGINEERING_SAMPLE_ORIGIN) {
        defaultWarehouseCode = 'LABORATORIO';
      }
    }
    const warehouse = await WarehouseStockService.getWarehouseByCode(warehouseCode || defaultWarehouseCode, transaction);

    for (const received of items) {
      if (!received.item_id || received.quantity === undefined) {
        throw new ValidationError('Cada item deve ter item_id e quantity');
      }
      const qty = parseFloat(received.quantity);
      if (Number.isNaN(qty) || qty <= 0) {
        throw new ValidationError('Quantidade deve ser maior que zero');
      }

      const item = purchase.items.find((candidate: any) => candidate.id === parseInt(received.item_id, 10));
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
        referenceType: 'purchase',
        warehouseId: warehouse.id
      });

      // Dual-write (Bloco 4, BUSINESS_RULES.md §12 item 3): mantem o saldo
      // por deposito em sincronia com products.quantity acima, na mesma
      // transacao.
      await WarehouseStockService.addToWarehouse(item.product_id, warehouse.id, qty, transaction);

      const providedLotNumber = received.lot_number ? String(received.lot_number).trim() : '';
      generatedLotSequence += 1;
      const lotNumber = providedLotNumber || buildGeneratedLotNumber({
        orderNumber: purchase.order_number,
        purchaseItemId: item.id,
        sequence: generatedLotSequence
      });

      const existingLot = await this.purchaseRepository.findLotForReceipt({
        product_id: item.product_id,
        purchase_id: purchase.id,
        lot_number: lotNumber
      }, transaction);

      // Lotes de recebimento de compra nascem/permanecem em quarentena
      // ('quarantine'): o estoque fisico (products.quantity) e incrementado
      // normalmente acima via InventoryService.receive, mas o CONSUMO por
      // lote fica bloqueado ate a inspecao de recebimento liberar o lote
      // (POST /api/inventory/lots/:id/release). O FEFO da producao
      // (ChangeProductionOrderStatusUseCase) so seleciona lotes com
      // status='available', logo lotes 'quarantine' ja ficam automaticamente
      // fora do consumo automatico sem nenhuma mudanca adicional la.
      if (existingLot) {
        const nextInitial = parseFloat(existingLot.quantity_initial || 0) + qty;
        const nextAvailable = parseFloat(existingLot.quantity_available || 0) + qty;
        await existingLot.update({
          supplier_id: purchase.supplier_id,
          status: 'quarantine',
          warehouse_id: warehouse.id,
          quantity_initial: nextInitial,
          quantity_available: nextAvailable,
          received_at: received.received_at || purchase.delivery_date || purchase.invoice_date || new Date(),
          manufactured_at: received.manufactured_at || existingLot.manufactured_at || null,
          expires_at: received.expires_at || existingLot.expires_at || null,
          created_by: userId,
          notes: received.lot_notes || existingLot.notes || `Recebimento PO ${purchase.order_number}`
        }, { transaction });
      } else {
        await this.purchaseRepository.createLot({
          product_id: item.product_id,
          supplier_id: purchase.supplier_id,
          purchase_id: purchase.id,
          lot_number: lotNumber,
          status: 'quarantine',
          warehouse_id: warehouse.id,
          quantity_initial: qty,
          quantity_available: qty,
          received_at: received.received_at || purchase.delivery_date || purchase.invoice_date || new Date(),
          manufactured_at: received.manufactured_at || null,
          expires_at: received.expires_at || null,
          created_by: userId,
          notes: received.lot_notes || `Recebimento PO ${purchase.order_number}`
        }, transaction);
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
    const allReceived = updatedItems.every((item: any) => item.status === 'received');
    purchase.status = allReceived ? 'received' : 'partial';
    await purchase.save({ transaction });

    return { purchase, previousStatus };
  }
}

module.exports = ReceivePurchaseItemsUseCase;
