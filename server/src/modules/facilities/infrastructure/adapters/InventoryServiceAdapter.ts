/**
 * Adapter de `InventoryService` - baixa consumo de insumo predial via
 * `CreateInventoryMovementUseCase` do modulo `inventory` (tipo `out`),
 * nunca escrita direta em `Item`/`InventoryMovement` a partir do modulo
 * `facilities` (D-3, RF-FAC-042/051).
 *
 * A origem do consumo predial fica registrada como movimento `adjustment`
 * com `reference_id` apontando para o ticket/execucao e `description`
 * carregando o rastro humano. Isso evita gravar literais fora do ENUM de
 * `inventory_movements.reference_type` e ainda deixa o evento auditavel.
 *
 * @module modules/facilities/infrastructure/adapters/InventoryServiceAdapter
 */

import InventoryService from '../../application/services/InventoryService';

const CreateInventoryMovementUseCase = require('../../../inventory/application/use-cases/CreateInventoryMovementUseCase');

class InventoryServiceAdapter extends InventoryService {
  public async registerConsumption(input: {
    item_id: string;
    quantity: number;
    userId: number;
    referenceType: 'facility_maintenance_ticket' | 'facility_cleaning_execution';
    referenceId: number;
    transaction: unknown;
  }): Promise<any> {
    const useCase = new CreateInventoryMovementUseCase();
    return useCase.execute({
      item_id: input.item_id,
      type: 'out',
      quantity: input.quantity,
      description: `Consumo interno - Facilities (${input.referenceType} #${input.referenceId})`,
      reference_id: input.referenceId,
      reference_type: 'adjustment',
      warehouse_code: 'INSUMOS',
      userId: input.userId,
      transaction: input.transaction as any,
    });
  }
}

export = InventoryServiceAdapter;
