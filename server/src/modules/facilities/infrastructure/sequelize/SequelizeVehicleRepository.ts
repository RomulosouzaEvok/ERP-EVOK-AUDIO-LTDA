/**
 * Implementação Sequelize/PostgreSQL do {@link VehicleRepository}.
 *
 * @module modules/facilities/infrastructure/sequelize/SequelizeVehicleRepository
 */

const VehicleRepository = require('../../domain/repositories/VehicleRepository');
const { FacilityVehicle } = require('../../../../models/index');

class SequelizeVehicleRepository extends VehicleRepository {
  async listVehicles(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;

    const { count, rows } = await FacilityVehicle.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['plate', 'ASC']],
    });

    return { rows, count };
  }

  async findVehicleById(id: number) {
    return FacilityVehicle.findByPk(id);
  }

  async findVehicleByPlate(plate: string) {
    return FacilityVehicle.findOne({ where: { plate } });
  }

  async createVehicle(data: Record<string, unknown>) {
    return FacilityVehicle.create(data);
  }

  async updateVehicle(id: number, data: Record<string, unknown>) {
    const vehicle = await FacilityVehicle.findByPk(id);
    if (!vehicle) return null;
    await vehicle.update(data);
    return vehicle;
  }
}

export = SequelizeVehicleRepository;
