/**
 * Implementação Sequelize do {@link VisitRepository}.
 *
 * @module modules/facilities/infrastructure/sequelize/SequelizeVisitRepository
 */

import VisitRepository from '../../domain/repositories/VisitRepository';

const { FacilityVisit, FacilityVisitor, Employee }: any = require('../../../../models/index');

class SequelizeVisitRepository extends VisitRepository {
  async list(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.host_employee_id) where.host_employee_id = filters.host_employee_id;

    return FacilityVisit.findAndCountAll({
      where,
      include: [
        { model: FacilityVisitor, as: 'visitor' },
        { model: Employee, as: 'hostEmployee', attributes: ['id', 'name'] },
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']],
    });
  }

  async findById(id: number) {
    return FacilityVisit.findByPk(id, {
      include: [
        { model: FacilityVisitor, as: 'visitor' },
        { model: Employee, as: 'hostEmployee', attributes: ['id', 'name'] },
      ],
    });
  }

  async create(data: Record<string, unknown>) {
    return FacilityVisit.create(data);
  }

  async update(id: number, data: Record<string, unknown>) {
    const visit = await FacilityVisit.findByPk(id);
    if (!visit) return null;
    await visit.update(data);
    return visit;
  }

  async listOnsite() {
    return FacilityVisit.findAll({
      where: { status: 'onsite' },
      include: [
        { model: FacilityVisitor, as: 'visitor' },
        { model: Employee, as: 'hostEmployee', attributes: ['id', 'name'] },
      ],
      order: [['checkin_at', 'ASC']],
    });
  }
}

export = SequelizeVisitRepository;
