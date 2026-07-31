/**
 * Implementacao Sequelize do repositorio de Ordens de Manutenção.
 *
 * @module modules/maintenance/infrastructure/sequelize/SequelizeMaintenanceRepository
 */

import MaintenanceRepository from '../../domain/repositories/MaintenanceRepository';
const { MaintenanceOrder, Asset, User }: any = require('../../../../models/index');

class SequelizeMaintenanceRepository extends MaintenanceRepository {
  /** @inheritdoc */
  public async findAndCountAll(
    filters: Record<string, unknown>,
    pagination: { limit: number; offset: number }
  ): Promise<{ count: number; rows: any[] }> {
    const { status, asset_id } = filters as any;
    const where: any = {};
    if (status) where.status = status;
    if (asset_id) where.asset_id = asset_id;
    return MaintenanceOrder.findAndCountAll({
      where,
      include: [
        { model: Asset, as: 'asset', attributes: ['id', 'name', 'tag'] },
        { model: User, as: 'technician', attributes: ['id', 'name'] }
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']]
    });
  }

  /** @inheritdoc */
  public async findById(id: number | string): Promise<any | null> {
    return MaintenanceOrder.findByPk(id, {
      include: [
        { model: Asset, as: 'asset' },
        { model: User, as: 'technician' },
        { model: User, as: 'reporter' },
        { model: User, as: 'diagnoser' }
      ]
    });
  }

  /** @inheritdoc */
  public async create(data: Record<string, unknown>): Promise<any> {
    return MaintenanceOrder.create(data);
  }

  /** @inheritdoc */
  public async update(id: number | string, data: Record<string, unknown>): Promise<number> {
    const [updated] = await MaintenanceOrder.update(data, { where: { id } });
    return updated;
  }
}

export = SequelizeMaintenanceRepository;
