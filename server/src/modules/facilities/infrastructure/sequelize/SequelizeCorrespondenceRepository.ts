/**
 * Implementação Sequelize do {@link CorrespondenceRepository}.
 *
 * @module modules/facilities/infrastructure/sequelize/SequelizeCorrespondenceRepository
 */

import { Op } from 'sequelize';
import CorrespondenceRepository from '../../domain/repositories/CorrespondenceRepository';

const { FacilityCorrespondence, Employee, Department }: any = require('../../../../models/index');

class SequelizeCorrespondenceRepository extends CorrespondenceRepository {
  async list(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.delivered === true) where.delivered_at = { [Op.ne]: null };
    if (filters.delivered === false) where.delivered_at = null;
    if (filters.recipient_employee_id) where.recipient_employee_id = filters.recipient_employee_id;
    if (filters.recipient_department_id) where.recipient_department_id = filters.recipient_department_id;

    return FacilityCorrespondence.findAndCountAll({
      where,
      include: [
        { model: Employee, as: 'recipientEmployee', attributes: ['id', 'name'], required: false },
        { model: Department, as: 'recipientDepartment', attributes: ['id', 'name'], required: false },
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['received_at', 'DESC']],
    });
  }

  async findById(id: number) {
    return FacilityCorrespondence.findByPk(id);
  }

  async create(data: Record<string, unknown>) {
    return FacilityCorrespondence.create(data);
  }

  async update(id: number, data: Record<string, unknown>) {
    const correspondence = await FacilityCorrespondence.findByPk(id);
    if (!correspondence) return null;
    await correspondence.update(data);
    return correspondence;
  }
}

export = SequelizeCorrespondenceRepository;
