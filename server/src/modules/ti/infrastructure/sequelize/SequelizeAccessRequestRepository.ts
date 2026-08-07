/**
 * Implementação Sequelize do repositório de ItAccessRequest.
 *
 * @module modules/ti/infrastructure/sequelize/SequelizeAccessRequestRepository
 */

import AccessRequestRepository from '../../domain/repositories/AccessRequestRepository';

const { ItAccessRequest, Employee, User, Department, AccessProfile }: any = require('../../../../models/index');

class SequelizeAccessRequestRepository extends AccessRequestRepository {
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const { Op } = require('sequelize');
    const where: Record<string, unknown> = {};
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.employee_id) where.employee_id = filters.employee_id;
    if (filters.department_id) where.department_id = filters.department_id;
    if (filters.pending_over_days) {
      const limit = new Date();
      limit.setDate(limit.getDate() - Number(filters.pending_over_days));
      where.status = 'pending';
      where.createdAt = { [Op.lte]: limit };
    }

    return ItAccessRequest.findAndCountAll({
      where,
      include: [
        { model: Employee, as: 'employee', attributes: ['id', 'name', 'department_id'] },
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: AccessProfile, as: 'requestedProfile', attributes: ['id', 'nome'], required: false },
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']],
    });
  }

  public async findById(id: number | string): Promise<any | null> {
    return ItAccessRequest.findByPk(id, {
      include: [
        { model: Employee, as: 'employee', attributes: ['id', 'name', 'department_id', 'user_id'] },
        { model: Department, as: 'department', attributes: ['id', 'name', 'manager_id'] },
        { model: AccessProfile, as: 'requestedProfile', attributes: ['id', 'nome'], required: false },
        { model: User, as: 'requestedByUser', attributes: ['id', 'name'], required: false },
        { model: User, as: 'approvedByUser', attributes: ['id', 'name'], required: false },
        { model: User, as: 'executedByUser', attributes: ['id', 'name'], required: false },
      ],
    });
  }

  public async countByYear(year: number): Promise<number> {
    const { Op } = require('sequelize');
    return ItAccessRequest.count({
      where: { createdAt: { [Op.gte]: new Date(`${year}-01-01T00:00:00Z`), [Op.lt]: new Date(`${year + 1}-01-01T00:00:00Z`) } },
    });
  }

  public async create(data: Record<string, unknown>): Promise<any> {
    return ItAccessRequest.create(data);
  }

  public async update(id: number | string, data: Record<string, unknown>): Promise<any | null> {
    const request = await ItAccessRequest.findByPk(id);
    if (!request) return null;
    await request.update(data);
    return request;
  }
}

export = SequelizeAccessRequestRepository;
