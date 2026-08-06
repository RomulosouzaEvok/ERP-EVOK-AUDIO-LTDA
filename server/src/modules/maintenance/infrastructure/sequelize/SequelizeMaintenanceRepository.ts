/**
 * Implementacao Sequelize do repositorio de Ordens de Manutenção.
 *
 * @module modules/maintenance/infrastructure/sequelize/SequelizeMaintenanceRepository
 */

import { Op } from 'sequelize';
import MaintenanceRepository from '../../domain/repositories/MaintenanceRepository';
const { MaintenanceOrder, Asset, User }: any = require('../../../../models/index');

/**
 * Status "abertos" (não-terminais) de uma ordem de manutenção — usados para
 * decidir se o ativo vinculado deve permanecer `in_maintenance` quando outra
 * OM do mesmo ativo é concluída/cancelada. `completed` e `canceled` são
 * terminais e não contam.
 */
const OPEN_MAINTENANCE_ORDER_STATUSES = ['open', 'scheduled', 'in_progress', 'waiting_parts'];

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
  public async findByIdForUpdate(id: number | string, transaction: any): Promise<any | null> {
    return MaintenanceOrder.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  }

  /** @inheritdoc */
  public async create(data: Record<string, unknown>): Promise<any> {
    return MaintenanceOrder.create(data);
  }

  /** @inheritdoc */
  public async update(id: number | string, data: Record<string, unknown>, transaction?: any): Promise<number> {
    const [updated] = await MaintenanceOrder.update(data, { where: { id }, transaction });
    return updated;
  }

  /** @inheritdoc */
  public async markAssetInMaintenance(assetId: number, transaction: any): Promise<void> {
    await Asset.update({ status: 'in_maintenance' }, { where: { id: assetId }, transaction });
  }

  /** @inheritdoc */
  public async releaseAssetFromMaintenanceIfNoOtherOpenOrders(
    assetId: number,
    excludeOrderId: number | string,
    transaction: any
  ): Promise<void> {
    const stillOpenCount = await MaintenanceOrder.count({
      where: {
        asset_id: assetId,
        id: { [Op.ne]: excludeOrderId },
        status: { [Op.in]: OPEN_MAINTENANCE_ORDER_STATUSES }
      },
      transaction
    });
    if (stillOpenCount > 0) return;

    // WHERE status='in_maintenance' garante que o UPDATE seja um no-op se o
    // ativo já saiu desse estado por outro caminho (ex.: baixado durante a
    // manutenção via NonConformity) — nunca "ressuscita" decommissioned/lost/
    // returned_to_supplier.
    await Asset.update(
      { status: 'active' },
      { where: { id: assetId, status: 'in_maintenance' }, transaction }
    );
  }
}

export = SequelizeMaintenanceRepository;
