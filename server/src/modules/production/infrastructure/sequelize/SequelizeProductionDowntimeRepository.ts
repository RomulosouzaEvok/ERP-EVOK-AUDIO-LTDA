/**
 * Implementação Sequelize/PostgreSQL de `ProductionDowntimeRepository`.
 *
 * @module modules/production/infrastructure/sequelize/SequelizeProductionDowntimeRepository
 */
import type { ListDowntimesFilters } from '../../domain/repositories/ProductionDowntimeTypes';
import ProductionDowntimeRepository = require('../../domain/repositories/ProductionDowntimeRepository');

const { Op } = require('sequelize');
const { ProductionDowntime, WorkCenter, ProductionOrder, User } = require('../../../../models/index');

const INCLUDE = [
  { model: WorkCenter, as: 'workCenter', attributes: ['id', 'code', 'name'] },
  { model: ProductionOrder, as: 'productionOrder', attributes: ['id', 'order_number'] },
  { model: User, as: 'createdBy', attributes: ['id', 'name'] },
];

class SequelizeProductionDowntimeRepository extends ProductionDowntimeRepository {
  /** @inheritdoc */
  async findOpenByWorkCenter(workCenterId: number, transaction?: any): Promise<any | null> {
    return ProductionDowntime.findOne({
      where: { work_center_id: workCenterId, finished_at: null },
      transaction,
      lock: transaction ? transaction.LOCK.UPDATE : undefined,
    });
  }

  /** @inheritdoc */
  async findById(id: number): Promise<any | null> {
    return ProductionDowntime.findByPk(id, { include: INCLUDE });
  }

  /** @inheritdoc */
  async findByIdForUpdate(id: number, transaction: any): Promise<any | null> {
    return ProductionDowntime.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  }

  /** @inheritdoc */
  async create(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return ProductionDowntime.create(data, { transaction });
  }

  /** @inheritdoc */
  async update(id: number, data: Record<string, unknown>, transaction?: any): Promise<number> {
    const [affected] = await ProductionDowntime.update(data, { where: { id }, transaction });
    return affected;
  }

  /** @inheritdoc */
  async list(filters: ListDowntimesFilters): Promise<{ rows: any[]; count: number }> {
    const where: any = {};
    if (filters.work_center_id) where.work_center_id = filters.work_center_id;
    if (filters.open) where.finished_at = null;
    if (filters.from || filters.to) {
      where.started_at = {};
      if (filters.from) where.started_at[Op.gte] = new Date(filters.from);
      if (filters.to) where.started_at[Op.lte] = new Date(filters.to);
    }

    const { rows, count } = await ProductionDowntime.findAndCountAll({
      where,
      include: INCLUDE,
      order: [['started_at', 'DESC']],
      limit: filters.limit,
      offset: filters.offset,
    });

    return { rows, count };
  }
}

export = SequelizeProductionDowntimeRepository;
