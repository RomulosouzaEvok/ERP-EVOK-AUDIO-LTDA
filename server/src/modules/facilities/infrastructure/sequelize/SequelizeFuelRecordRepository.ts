/**
 * Implementação Sequelize/PostgreSQL do {@link FuelRecordRepository}.
 *
 * @module modules/facilities/infrastructure/sequelize/SequelizeFuelRecordRepository
 */

const FuelRecordRepository = require('../../domain/repositories/FuelRecordRepository');
const { FacilityFuelRecord, Asset, Employee } = require('../../../../models/index');

class SequelizeFuelRecordRepository extends FuelRecordRepository {
  async listFuelRecords(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.asset_id) where.asset_id = filters.asset_id;
    if (filters.full_tank !== undefined) where.full_tank = filters.full_tank;

    const { count, rows } = await FacilityFuelRecord.findAndCountAll({
      where,
      include: [
        { model: Asset, as: 'asset', attributes: ['id', 'name', 'tag'] },
        { model: Employee, as: 'driver', attributes: ['id', 'name'], required: false },
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['record_date', 'DESC']],
    });

    return { rows, count };
  }

  async findFuelRecordById(id: number) {
    return FacilityFuelRecord.findByPk(id, {
      include: [
        { model: Asset, as: 'asset', attributes: ['id', 'name', 'tag'] },
        { model: Employee, as: 'driver', attributes: ['id', 'name'], required: false },
      ],
    });
  }

  async createFuelRecord(data: Record<string, unknown>) {
    const created = await FacilityFuelRecord.create(data);
    return this.findFuelRecordById(created.id);
  }

  async updateFuelRecord(id: number, data: Record<string, unknown>) {
    const record = await FacilityFuelRecord.findByPk(id);
    if (!record) return null;
    await record.update(data);
    return this.findFuelRecordById(id);
  }

  async listRecentFullTank(assetId: number, limit: number) {
    return FacilityFuelRecord.findAll({
      where: { asset_id: assetId, full_tank: true },
      order: [['record_date', 'DESC']],
      limit,
    });
  }
}

export = SequelizeFuelRecordRepository;
