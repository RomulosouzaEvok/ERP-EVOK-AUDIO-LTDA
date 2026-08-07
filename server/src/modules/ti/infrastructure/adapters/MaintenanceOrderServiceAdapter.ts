/**
 * Adapter de `MaintenanceOrderService` — cria `MaintenanceOrder` via o
 * model Sequelize real de `server/src/modules/maintenance/`, sem duplicar
 * o fluxo de manutenção (RF-TI-007/RF-TI-021/BR-TI-009).
 *
 * @module modules/ti/infrastructure/adapters/MaintenanceOrderServiceAdapter
 */

import MaintenanceOrderService from '../../application/services/MaintenanceOrderService';

const { MaintenanceOrder }: any = require('../../../../models/index');

class MaintenanceOrderServiceAdapter extends MaintenanceOrderService {
  public async createFromAsset(data: { asset_id: number; problem_description: string; reported_by: number; priority?: string }): Promise<any> {
    return MaintenanceOrder.create({
      order_number: `MO-TI-${Date.now()}`,
      asset_id: data.asset_id,
      maintenance_type: 'corrective',
      priority: data.priority ?? 'normal',
      problem_description: data.problem_description,
      reported_by: data.reported_by,
      report_date: new Date().toISOString().slice(0, 10),
      status: 'open',
      created_by: data.reported_by,
    });
  }
}

export = MaintenanceOrderServiceAdapter;
