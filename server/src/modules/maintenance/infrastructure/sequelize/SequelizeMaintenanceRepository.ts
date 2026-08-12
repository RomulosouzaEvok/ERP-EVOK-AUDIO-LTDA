/**
 * Implementacao Sequelize do repositorio de Ordens de Manutenção.
 *
 * @module modules/maintenance/infrastructure/sequelize/SequelizeMaintenanceRepository
 */

import { Op, QueryTypes } from 'sequelize';
import MaintenanceRepository from '../../domain/repositories/MaintenanceRepository';
const { MaintenanceOrder, Asset, User }: any = require('../../../../models/index');
const { sequelize } = require('../../../../config/database');

/**
 * Classe do `pg_advisory_xact_lock` da numeração de OM. A produção usa 41001
 * para `production_orders` (`SequelizeProductionOrderRepository`); 41002 é o
 * espaço deste módulo — classes distintas para os dois geradores não se
 * serializarem entre si.
 */
const ORDER_NUMBER_LOCK_CLASS_ID = 41002;

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
  public async nextOrderNumberForYear(yearPrefix: string, transaction: any): Promise<string> {
    const year = Number(yearPrefix.split('-').pop());

    await sequelize.query(
      'SELECT pg_advisory_xact_lock(:classId, :year)',
      { replacements: { classId: ORDER_NUMBER_LOCK_CLASS_ID, year }, transaction }
    );

    // `LIKE 'OM-2026-%'` também isola a numeração dos chamados prediais de
    // Facilities, que gravam nesta MESMA tabela com prefixo `MO-FAC-`.
    const rows: any[] = await sequelize.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM '([0-9]+)$') AS INTEGER)), 0) AS max_sequence
         FROM maintenance_orders
        WHERE order_number LIKE :prefix`,
      { replacements: { prefix: `${yearPrefix}-%` }, type: QueryTypes.SELECT, transaction }
    );

    const nextSequence = Number(rows[0]?.max_sequence ?? 0) + 1;
    return `${yearPrefix}-${String(nextSequence).padStart(4, '0')}`;
  }

  /** @inheritdoc */
  public async create(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return MaintenanceOrder.create(data, { transaction });
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
