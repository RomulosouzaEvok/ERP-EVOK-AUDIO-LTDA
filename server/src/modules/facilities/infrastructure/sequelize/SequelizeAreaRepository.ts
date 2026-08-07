/**
 * Implementação Sequelize/PostgreSQL do {@link AreaRepository}.
 *
 * @module modules/facilities/infrastructure/sequelize/SequelizeAreaRepository
 */

const AreaRepository = require('../../domain/repositories/AreaRepository');
const { FacilityArea, Department } = require('../../../../models/index');

class SequelizeAreaRepository extends AreaRepository {
  async listAreas(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.area_type) where.area_type = filters.area_type;
    if (filters.department_id) where.department_id = filters.department_id;

    const { count, rows } = await FacilityArea.findAndCountAll({
      where,
      include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['name', 'ASC']],
    });

    return { rows, count };
  }

  async findAreaById(id: number) {
    return FacilityArea.findByPk(id, {
      include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
    });
  }

  async createArea(data: Record<string, unknown>) {
    const created = await FacilityArea.create(data);
    return this.findAreaById(created.id);
  }

  async updateArea(id: number, data: Record<string, unknown>) {
    const area = await FacilityArea.findByPk(id);
    if (!area) return null;
    await area.update(data);
    return this.findAreaById(id);
  }
}

export = SequelizeAreaRepository;
