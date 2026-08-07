/**
 * Implementação Sequelize do {@link DriverRepository}.
 *
 * @module modules/facilities/infrastructure/sequelize/SequelizeDriverRepository
 */

import { Op } from 'sequelize';
import DriverRepository from '../../domain/repositories/DriverRepository';

const { FacilityDriver, Employee }: any = require('../../../../models/index');

class SequelizeDriverRepository extends DriverRepository {
  async list(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.authorized !== undefined) where.authorized = filters.authorized;
    if (filters.employee_id) where.employee_id = filters.employee_id;
    if (filters.cnh_expiring) {
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() + 30);
      where.cnh_valid_until = { [Op.lte]: limitDate.toISOString().slice(0, 10) };
    }

    return FacilityDriver.findAndCountAll({
      where,
      include: [{ model: Employee, as: 'employee', attributes: ['id', 'name'] }],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['id', 'DESC']],
    });
  }

  async findById(id: number) {
    return FacilityDriver.findByPk(id, { include: [{ model: Employee, as: 'employee', attributes: ['id', 'name'] }] });
  }

  async findByEmployeeId(employeeId: number) {
    return FacilityDriver.findOne({ where: { employee_id: employeeId } });
  }

  async create(data: Record<string, unknown>) {
    return FacilityDriver.create(data);
  }

  async update(id: number, data: Record<string, unknown>) {
    const driver = await FacilityDriver.findByPk(id);
    if (!driver) return null;
    await driver.update(data);
    return driver;
  }
}

export = SequelizeDriverRepository;
