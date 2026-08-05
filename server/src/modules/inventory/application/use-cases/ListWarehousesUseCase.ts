/**
 * Use case: listar depósitos ativos.
 *
 * @module modules/inventory/application/use-cases/ListWarehousesUseCase
 *
 * Cobre `GET /api/inventory/warehouses`.
 */

import UseCase from '../../../../shared/application/UseCase';
import InventoryRepository = require('../../domain/repositories/InventoryRepository');

class ListWarehousesUseCase extends UseCase<void, any[]> {
  private readonly inventoryRepository: InventoryRepository;

  /** @param inventoryRepository - Repositório de estoque. */
  constructor(inventoryRepository: InventoryRepository) {
    super();
    this.inventoryRepository = inventoryRepository;
  }

  /**
   * @returns Lista de depósitos ativos, ordenados por código.
   */
  public async execute(): Promise<any[]> {
    return this.inventoryRepository.listActiveWarehouses();
  }
}

export = ListWarehousesUseCase;
