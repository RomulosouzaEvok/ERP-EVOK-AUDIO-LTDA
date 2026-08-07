/**
 * Implementação Sequelize do repositório de ItResponsibilityTerm.
 *
 * @module modules/ti/infrastructure/sequelize/SequelizeResponsibilityTermRepository
 */

import ResponsibilityTermRepository from '../../domain/repositories/ResponsibilityTermRepository';

const { ItResponsibilityTerm, Asset, Employee, User }: any = require('../../../../models/index');

class SequelizeResponsibilityTermRepository extends ResponsibilityTermRepository {
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const where: Record<string, unknown> = {};
    if (filters.employee_id) where.employee_id = filters.employee_id;
    if (filters.asset_id) where.asset_id = filters.asset_id;
    if (filters.status) where.status = filters.status;

    const include: any[] = [
      { model: Asset, as: 'asset', attributes: ['id', 'tag', 'name', 'department_id'] },
      { model: Employee, as: 'employee', attributes: ['id', 'name', 'department_id'] },
    ];
    if (filters.department_id) {
      include[0].where = { department_id: filters.department_id };
    }

    return ItResponsibilityTerm.findAndCountAll({ where, include, limit: pagination.limit, offset: pagination.offset, order: [['createdAt', 'DESC']] });
  }

  public async findById(id: number | string): Promise<any | null> {
    return ItResponsibilityTerm.findByPk(id, {
      include: [
        { model: Asset, as: 'asset', attributes: ['id', 'tag', 'name'] },
        { model: Employee, as: 'employee', attributes: ['id', 'name'] },
        { model: User, as: 'deliveredByUser', attributes: ['id', 'name'], required: false },
        { model: User, as: 'receivedByUser', attributes: ['id', 'name'], required: false },
      ],
    });
  }

  public async findActiveByAsset(assetId: number | string): Promise<any | null> {
    return ItResponsibilityTerm.findOne({ where: { asset_id: assetId, status: 'active' } });
  }

  public async findActiveByEmployee(employeeId: number | string): Promise<any[]> {
    return ItResponsibilityTerm.findAll({
      where: { employee_id: employeeId, status: 'active' },
      include: [{ model: Asset, as: 'asset', attributes: ['id', 'tag', 'name'] }],
    });
  }

  public async listByEmployee(employeeId: number | string): Promise<any[]> {
    return ItResponsibilityTerm.findAll({
      where: { employee_id: employeeId },
      include: [{ model: Asset, as: 'asset', attributes: ['id', 'tag', 'name'] }],
      order: [['createdAt', 'DESC']],
    });
  }

  public async countAll(): Promise<number> {
    return ItResponsibilityTerm.count();
  }

  public async create(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return ItResponsibilityTerm.create(data, transaction ? { transaction } : undefined);
  }

  public async update(id: number | string, data: Record<string, unknown>, transaction?: any): Promise<any | null> {
    const term = await ItResponsibilityTerm.findByPk(id, transaction ? { transaction, lock: transaction.LOCK.UPDATE } : undefined);
    if (!term) return null;
    await term.update(data, transaction ? { transaction } : undefined);
    return term;
  }
}

export = SequelizeResponsibilityTermRepository;
