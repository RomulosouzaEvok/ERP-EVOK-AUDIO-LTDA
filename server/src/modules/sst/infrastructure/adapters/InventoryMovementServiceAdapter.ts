/**
 * Adapter que implementa `InventoryMovementService` (interface do módulo
 * SST) delegando ao use case real de movimentação de estoque do módulo
 * `inventory` — nunca importa Sequelize/Model do `inventory` diretamente
 * (Clean Architecture, baixo acoplamento entre módulos).
 *
 * @module modules/sst/infrastructure/adapters/InventoryMovementServiceAdapter
 */

import type { InventoryMovementService, RegisterOutboundInput, RegisterOutboundResult } from '../../application/services/InventoryMovementService';

const CreateInventoryMovementUseCase = require('../../../inventory/application/use-cases/CreateInventoryMovementUseCase');
const { BusinessRuleError } = require('../../../../errors');

const createInventoryMovementUseCase = new CreateInventoryMovementUseCase();

class InventoryMovementServiceAdapter implements InventoryMovementService {
  /**
   * Registra uma saída de estoque (`type: 'out'`) para o `Item` vinculado
   * ao TipoEPI, na MESMA transação da confirmação da EntregaEPI. Reaproveita
   * 100% `CreateInventoryMovementUseCase` (dual-write depósito INSUMOS +
   * `products.quantity`) — nenhum controle de saldo paralelo.
   *
   * @param input - Dados da saída (item, quantidade, origem, transação compartilhada).
   * @returns O movimento de estoque criado.
   * @throws {BusinessRuleError} Se o estoque do depósito for insuficiente (409 mapeado pelo controller).
   */
  public async registerOutbound(input: RegisterOutboundInput): Promise<RegisterOutboundResult> {
    const result = await createInventoryMovementUseCase.execute({
      item_id: input.item_id,
      type: 'out',
      quantity: input.quantity,
      description: input.reason,
      reference_id: input.reference_id,
      reference_type: input.reference_type,
      userId: input.userId,
      transaction: input.transaction
    });

    if (!result || !result.movement) {
      throw new BusinessRuleError('Falha ao registrar a saída de estoque do EPI.');
    }

    return { movement: { id: result.movement.id } };
  }
}

export = InventoryMovementServiceAdapter;
