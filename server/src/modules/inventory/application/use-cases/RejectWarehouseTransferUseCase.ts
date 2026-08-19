/**
 * Use case: rejeitar transferência de saldo entre depósitos.
 *
 * @module modules/inventory/application/use-cases/RejectWarehouseTransferUseCase
 *
 * Cobre `PUT /api/inventory/transfers/:id/reject`
 * (`authorizeModule('estoque', 'approve')`). Não altera nenhum saldo —
 * apenas marca a solicitação como `rejected`, com o motivo obrigatório
 * (docs/business/BUSINESS_RULES.md §12 item 8: solicitação e aprovação
 * são eventos distintos, ambos auditados).
 */

import UseCase from '../../../../shared/application/UseCase';
import InventoryRepository = require('../../domain/repositories/InventoryRepository');
import { NotFoundError, BusinessRuleError, ValidationError } from '../../../../errors';
import { Transaction } from 'sequelize';
import {
  SEGREGATION_RULES,
  assertApproverIsNotRequester,
} from '../../../../shared/domain/segregationOfDuties';

interface RejectWarehouseTransferInput {
  id: number | string;
  approverId: number;
  reason: string;
  transaction: Transaction;
}

class RejectWarehouseTransferUseCase extends UseCase<RejectWarehouseTransferInput, any> {
  private readonly inventoryRepository: InventoryRepository;

  /** @param inventoryRepository - Repositório de estoque. */
  constructor(inventoryRepository: InventoryRepository) {
    super();
    this.inventoryRepository = inventoryRepository;
  }

  /**
   * @param input - Id da transferência, id do aprovador e motivo da rejeição.
   * @returns Transferência atualizada (`status = 'rejected'`).
   * @throws {ValidationError} Se o motivo estiver ausente.
   * @throws {NotFoundError} Se a transferência não existir.
   * @throws {BusinessRuleError} Se a transferência não estiver `pending`.
   */
  public async execute(input: RejectWarehouseTransferInput): Promise<any> {
    const reason = String(input.reason || '').trim();
    if (!reason) {
      throw new ValidationError('reason (motivo da rejeição) é obrigatório.');
    }

    const transfer = await this.inventoryRepository.findWarehouseTransferForUpdate(input.id, input.transaction);
    if (!transfer) {
      throw new NotFoundError('Transferência entre depósitos não encontrada.');
    }
    if (transfer.status !== 'pending') {
      throw new BusinessRuleError(
        `Apenas transferências 'pending' podem ser rejeitadas. Status atual: '${transfer.status}'.`
      );
    }

    assertApproverIsNotRequester({
      rule: SEGREGATION_RULES.WAREHOUSE_TRANSFER_REJECT,
      requesterUserId: transfer.user_id,
      approverUserId: input.approverId,
      documentLabel: `a transferencia entre depositos #${transfer.id}`,
      approverHint: "outro usuario com nivel 'approve' no modulo estoque",
    });

    await transfer.update({
      status: 'rejected',
      approved_by: input.approverId,
      reason: `${transfer.reason} | Rejeitada: ${reason}`,
    }, { transaction: input.transaction });

    return transfer;
  }
}

export = RejectWarehouseTransferUseCase;
