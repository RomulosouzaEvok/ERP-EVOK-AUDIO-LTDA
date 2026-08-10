/**
 * Implementação Sequelize do repositório de `HrVacationAccrualPeriod`.
 * @module modules/rh/infrastructure/sequelize/SequelizeVacationAccrualPeriodRepository
 */
import VacationAccrualPeriodRepository from '../../domain/repositories/VacationAccrualPeriodRepository';

const { HrVacationAccrualPeriod }: any = require('../../../../models/index');

class SequelizeVacationAccrualPeriodRepository extends VacationAccrualPeriodRepository {
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }) {
    const where: Record<string, unknown> = {};
    if (filters.employee_id) where.employee_id = filters.employee_id;
    if (filters.status) where.status = filters.status;
    return HrVacationAccrualPeriod.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['period_start', 'DESC']],
    });
  }

  public async findById(id: number | string) {
    return HrVacationAccrualPeriod.findByPk(id);
  }

  public async create(data: Record<string, unknown>, transaction?: unknown) {
    return HrVacationAccrualPeriod.create(data, { transaction: transaction as any });
  }

  public async update(id: number | string, data: Record<string, unknown>, transaction?: unknown) {
    const record = await HrVacationAccrualPeriod.findByPk(id, { transaction: transaction as any });
    if (!record) return null;
    await record.update(data, { transaction: transaction as any });
    return record;
  }

  public async findOpenByEmployeeId(employeeId: number | string) {
    const { Op } = require('sequelize');
    return HrVacationAccrualPeriod.findOne({
      where: { employee_id: employeeId, status: { [Op.in]: ['em_curso', 'programado'] } },
      order: [['period_start', 'DESC']],
    });
  }

  public async findAllOpen() {
    const { Op } = require('sequelize');
    return HrVacationAccrualPeriod.findAll({ where: { status: { [Op.in]: ['em_curso', 'programado'] } } });
  }
}

export = SequelizeVacationAccrualPeriodRepository;
