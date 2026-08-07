/**
 * Interface de serviço para criação de `MaintenanceOrder` a partir do
 * módulo `ti` (RF-TI-007/RF-TI-021), sem import direto do model.
 * Implementada por `MaintenanceOrderServiceAdapter`.
 *
 * @module modules/ti/application/services/MaintenanceOrderService
 */

class MaintenanceOrderService {
  public async createFromAsset(_data: { asset_id: number; problem_description: string; reported_by: number; priority?: string }): Promise<any> {
    throw new Error('MaintenanceOrderService.createFromAsset não implementado.');
  }
}

export = MaintenanceOrderService;
