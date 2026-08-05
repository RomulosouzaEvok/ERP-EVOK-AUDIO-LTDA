/**
 * Use case: aprovar transferência de saldo entre depósitos.
 *
 * @module modules/inventory/application/use-cases/ApproveWarehouseTransferUseCase
 *
 * Cobre `PUT /api/inventory/transfers/:id/approve`
 * (`authorizeModule('estoque', 'approve')`). Executa a transferência
 * atomicamente: debita a origem, credita o destino, gera dois
 * `InventoryMovement` (`type='transfer'`) referenciando esta
 * transferência — `products.quantity` NUNCA muda (a transferência não
 * altera o saldo total do produto, apenas onde ele está fisicamente,
 * docs/business/BUSINESS_RULES.md §12 itens 4, 6 e 8).
 */

const WarehouseStockService: any = require('../../../../services/warehouseStockService');

import UseCase from '../../../../shared/application/UseCase';
import InventoryRepository = require('../../domain/repositories/InventoryRepository');
import { NotFoundError, BusinessRuleError } from '../../../../errors';
import { Transaction } from 'sequelize';

interface ApproveWarehouseTransferInput {
  id: number | string;
  approverId: number;
  transaction: Transaction;
}

class ApproveWarehouseTransferUseCase extends UseCase<ApproveWarehouseTransferInput, any> {
  private readonly inventoryRepository: InventoryRepository;

  /** @param inventoryRepository - Repositório de estoque. */
  constructor(inventoryRepository: InventoryRepository) {
    super();
    this.inventoryRepository = inventoryRepository;
  }

  /**
   * @param input - Id da transferência, id do aprovador e transação ativa.
   * @returns Transferência atualizada (`status = 'approved'`).
   * @throws {NotFoundError} Se a transferência não existir.
   * @throws {BusinessRuleError} Se a transferência não estiver `pending`, ou se o saldo de origem for insuficiente NO MOMENTO da aprovação.
   */
  public async execute(input: ApproveWarehouseTransferInput): Promise<any> {
    const transfer = await this.inventoryRepository.findWarehouseTransferForUpdate(input.id, input.transaction);

    if (!transfer) {
      throw new NotFoundError('Transferência entre depósitos não encontrada.');
    }
    if (transfer.status !== 'pending') {
      throw new BusinessRuleError(
        `Apenas transferências 'pending' podem ser aprovadas. Status atual: '${transfer.status}'.`
      );
    }

    const quantity = Number(transfer.quantity);

    // Débito da origem (422 didático se saldo insuficiente NO MOMENTO da
    // aprovação — o saldo pode ter mudado desde a solicitação).
    await WarehouseStockService.removeFromWarehouse(transfer.product_id, transfer.from_warehouse_id, quantity, input.transaction);
    // Crédito do destino — soma total do produto permanece invariante.
    await WarehouseStockService.addToWarehouse(transfer.product_id, transfer.to_warehouse_id, quantity, input.transaction);

    await this.inventoryRepository.createInventoryMovement({
      product_id: transfer.product_id,
      user_id: input.approverId,
      warehouse_id: transfer.from_warehouse_id,
      type: 'transfer',
      quantity,
      description: `Transferência #${transfer.id} - saída (${transfer.reason})`,
      reference_id: transfer.id,
      reference_type: 'transfer',
    }, input.transaction);

    await this.inventoryRepository.createInventoryMovement({
      product_id: transfer.product_id,
      user_id: input.approverId,
      warehouse_id: transfer.to_warehouse_id,
      type: 'transfer',
      quantity,
      description: `Transferência #${transfer.id} - entrada (${transfer.reason})`,
      reference_id: transfer.id,
      reference_type: 'transfer',
    }, input.transaction);

    await transfer.update({
      status: 'approved',
      approved_by: input.approverId,
    }, { transaction: input.transaction });

    return transfer;
  }
}

export = ApproveWarehouseTransferUseCase;
