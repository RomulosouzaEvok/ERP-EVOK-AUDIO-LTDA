/**
 * Use case: listar transferências entre depósitos com filtro de status.
 *
 * @module modules/inventory/application/use-cases/ListWarehouseTransfersUseCase
 *
 * Cobre `GET /api/inventory/transfers?status=`.
 */

import UseCase from '../../../../shared/application/UseCase';
import InventoryRepository = require('../../domain/repositories/InventoryRepository');
import { ValidationError } from '../../../../errors';

interface ListWarehouseTransfersInput {
  status?: string;
}

const VALID_STATUSES = ['pending', 'approved', 'rejected'];

class ListWarehouseTransfersUseCase extends UseCase<ListWarehouseTransfersInput, any[]> {
  private readonly inventoryRepository: InventoryRepository;

  /** @param inventoryRepository - Repositório de estoque. */
  constructor(inventoryRepository: InventoryRepository) {
    super();
    this.inventoryRepository = inventoryRepository;
  }

  /**
   * @param input - Filtro opcional de `status`.
   * @returns Lista de transferências com `product`, `fromWarehouse`, `toWarehouse`, `requestedBy` e `approvedBy` incluídos.
   * @throws {ValidationError} Se `status` informado não for um valor válido do enum.
   */
  public async execute(input: ListWarehouseTransfersInput): Promise<any[]> {
    const where: Record<string, unknown> = {};
    if (input.status) {
      if (!VALID_STATUSES.includes(input.status)) {
        throw new ValidationError(`status inválido. Valores aceitos: ${VALID_STATUSES.join(', ')}.`);
      }
      where.status = input.status;
    }

    return this.inventoryRepository.listWarehouseTransfers(where);
  }
}

export = ListWarehouseTransfersUseCase;
