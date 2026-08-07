/**
 * Adapter de `MaintenanceOrderService` — chamado predial (D-1) sobre a
 * MESMA tabela `maintenance_orders` do módulo `server/src/modules/
 * maintenance/`, reaproveitando `SequelizeMaintenanceRepository` para
 * criação/atualização (preserva a sincronização `Asset.status`↔ordem já
 * implementada ali — RF-PAT-05), com uma consulta de listagem própria
 * (filtros específicos de chamado predial: `facility_area_id`,
 * `facility_specialty`, que o repositório de MANUT não expõe).
 *
 * @module modules/facilities/infrastructure/adapters/MaintenanceOrderServiceAdapter
 */

import { Op } from 'sequelize';
import MaintenanceOrderService from '../../application/services/MaintenanceOrderService';

const SequelizeMaintenanceRepository = require('../../../maintenance/infrastructure/sequelize/SequelizeMaintenanceRepository');
const { MaintenanceOrder, FacilityArea, Asset }: any = require('../../../../models/index');

const maintenanceRepository = new SequelizeMaintenanceRepository();

class MaintenanceOrderServiceAdapter extends MaintenanceOrderService {
  public async createTicket(data: Record<string, unknown>): Promise<any> {
    return maintenanceRepository.create(data);
  }

  public async listTickets(
    filters: { facility_specialty?: string; priority?: string; status?: string; facility_area_id?: number },
    pagination: { limit: number; offset: number },
  ): Promise<{ count: number; rows: any[] }> {
    const where: any = { facility_area_id: { [Op.ne]: null } };
    if (filters.facility_specialty) where.facility_specialty = filters.facility_specialty;
    if (filters.priority) where.priority = filters.priority;
    if (filters.status) where.status = filters.status;
    if (filters.facility_area_id) where.facility_area_id = filters.facility_area_id;

    return MaintenanceOrder.findAndCountAll({
      where,
      include: [
        { model: FacilityArea, as: 'facilityArea', attributes: ['id', 'name'] },
        { model: Asset, as: 'asset', attributes: ['id', 'name', 'tag'], required: false },
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']],
    });
  }

  public async findTicketById(id: number): Promise<any | null> {
    return MaintenanceOrder.findByPk(id, {
      include: [
        { model: FacilityArea, as: 'facilityArea' },
        { model: Asset, as: 'asset', required: false },
      ],
    });
  }

  public async findTicketByIdForUpdate(id: number, transaction: unknown): Promise<any | null> {
    return maintenanceRepository.findByIdForUpdate(id, transaction);
  }

  public async updateTicket(id: number, data: Record<string, unknown>, transaction?: unknown): Promise<number> {
    return maintenanceRepository.update(id, data, transaction);
  }
}

export = MaintenanceOrderServiceAdapter;
