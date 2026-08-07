/**
 * Implementação Sequelize/PostgreSQL do {@link FuelRecordRepository}.
 *
 * @module modules/facilities/infrastructure/sequelize/SequelizeFuelRecordRepository
 */

const FuelRecordRepository = require('../../domain/repositories/FuelRecordRepository');
const { FacilityFuelRecord, FacilityVehicle, Employee } = require('../../../../models/index');

class SequelizeFuelRecordRepository extends FuelRecordRepository {
  async listFuelRecords(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.vehicle_id) where.vehicle_id = filters.vehicle_id;

    const { count, rows } = await FacilityFuelRecord.findAndCountAll({
      where,
      include: [
        { model: FacilityVehicle, as: 'vehicle', attributes: ['id', 'plate', 'brand', 'model'] },
        { model: Employee, as: 'driver', attributes: ['id', 'name'] },
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
        { model: FacilityVehicle, as: 'vehicle', attributes: ['id', 'plate', 'brand', 'model'] },
        { model: Employee, as: 'driver', attributes: ['id', 'name'] },
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
}

export = SequelizeFuelRecordRepository;
