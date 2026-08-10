/**
 * Implementação Sequelize do repositório de `HrTerminationProcess`.
 * @module modules/rh/infrastructure/sequelize/SequelizeTerminationProcessRepository
 */
import TerminationProcessRepository from '../../domain/repositories/TerminationProcessRepository';

const { HrTerminationProcess }: any = require('../../../../models/index');

const OPEN_TERMINATION_STATUSES = ['aberto', 'aguardando_aso', 'aguardando_trct'];

class SequelizeTerminationProcessRepository extends TerminationProcessRepository {
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }) {
    const { Op } = require('sequelize');
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.payment_deadline_at_risk) {
      const today = new Date().toISOString().slice(0, 10);
      const riskDate = new Date();
      riskDate.setDate(riskDate.getDate() + 3);
      where.payment_deadline = { [Op.lte]: riskDate.toISOString().slice(0, 10) };
      where.trct_paid_at = null;
      where.status = { [Op.ne]: 'cancelado' };
      void today;
    }
    return HrTerminationProcess.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']],
    });
  }

  public async findById(id: number | string) {
    return HrTerminationProcess.findByPk(id);
  }

  public async findOpenByEmployeeId(employeeId: number | string) {
    const { Op } = require('sequelize');
    return HrTerminationProcess.findOne({
      where: { employee_id: employeeId, status: { [Op.in]: OPEN_TERMINATION_STATUSES } },
      order: [['createdAt', 'DESC']],
    });
  }

  public async create(data: Record<string, unknown>) {
    return HrTerminationProcess.create(data);
  }

  public async update(id: number | string, data: Record<string, unknown>, transaction?: unknown) {
    const record = await HrTerminationProcess.findByPk(id, { transaction: transaction as any });
    if (!record) return null;
    await record.update(data, { transaction: transaction as any });
    return record;
  }
}

export = SequelizeTerminationProcessRepository;
