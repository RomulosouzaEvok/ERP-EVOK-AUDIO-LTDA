/**
 * Implementação Sequelize do repositório de `HrAdmissionProcess`.
 * @module modules/rh/infrastructure/sequelize/SequelizeAdmissionProcessRepository
 */
import AdmissionProcessRepository from '../../domain/repositories/AdmissionProcessRepository';

const { HrAdmissionProcess }: any = require('../../../../models/index');

class SequelizeAdmissionProcessRepository extends AdmissionProcessRepository {
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }) {
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.department_id) where.department_id = filters.department_id;
    return HrAdmissionProcess.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']],
    });
  }

  public async findById(id: number | string) {
    return HrAdmissionProcess.findByPk(id);
  }

  public async create(data: Record<string, unknown>) {
    return HrAdmissionProcess.create(data);
  }

  public async update(id: number | string, data: Record<string, unknown>, transaction?: unknown) {
    const record = await HrAdmissionProcess.findByPk(id, { transaction: transaction as any });
    if (!record) return null;
    await record.update(data, { transaction: transaction as any });
    return record;
  }
}

export = SequelizeAdmissionProcessRepository;
