/**
 * Interface de serviço para baixa de consumo de insumo predial contra o
 * estoque real (D-3 — Facilities não tem estoque próprio, RF-FAC-042/051),
 * sem import direto de `Item`/`InventoryMovement`. Implementada por
 * `InventoryServiceAdapter`, que delega a
 * `CreateInventoryMovementUseCase` do módulo `inventory`.
 *
 * @module modules/facilities/application/services/InventoryService
 */

interface RegisterConsumptionInput {
  item_id: string;
  quantity: number;
  userId: number;
  referenceType: 'facility_maintenance_ticket' | 'facility_cleaning_execution';
  referenceId: number;
  transaction: unknown;
}

class InventoryService {
  public async registerConsumption(_input: RegisterConsumptionInput): Promise<any> {
    throw new Error('InventoryService.registerConsumption não implementado.');
  }
}

export = InventoryService;
