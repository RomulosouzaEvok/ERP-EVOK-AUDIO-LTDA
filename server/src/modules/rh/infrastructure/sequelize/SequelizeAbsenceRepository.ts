/**
 * Implementação Sequelize do repositório de `HrAbsence`.
 * @module modules/rh/infrastructure/sequelize/SequelizeAbsenceRepository
 */
import AbsenceRepository from '../../domain/repositories/AbsenceRepository';

const { HrAbsence }: any = require('../../../../models/index');

class SequelizeAbsenceRepository extends AbsenceRepository {
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }) {
    const { Op } = require('sequelize');
    const where: Record<string, unknown> = {};
    if (filters.employee_id) where.employee_id = filters.employee_id;
    if (filters.type) where.type = filters.type;
    if (filters.open === true) where.actual_end_date = { [Op.is]: null };
    if (filters.open === false) where.actual_end_date = { [Op.ne]: null };
    return HrAbsence.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['start_date', 'DESC']],
    });
  }

  public async findById(id: number | string) {
    return HrAbsence.findByPk(id);
  }

  public async create(data: Record<string, unknown>, transaction?: unknown) {
    return HrAbsence.create(data, { transaction: transaction as any });
  }

  public async update(id: number | string, data: Record<string, unknown>, transaction?: unknown) {
    const record = await HrAbsence.findByPk(id, { transaction: transaction as any });
    if (!record) return null;
    await record.update(data, { transaction: transaction as any });
    return record;
  }

  public async findOpenByEmployeeId(employeeId: number | string) {
    const { Op } = require('sequelize');
    return HrAbsence.findOne({
      where: { employee_id: employeeId, actual_end_date: { [Op.is]: null } },
      order: [['start_date', 'DESC']],
    });
  }

  public async sumAccumulatedDaysByEmployee(employeeId: number | string, types: readonly string[], sinceDate: string, transaction?: unknown) {
    const { Op, fn, col } = require('sequelize');
    const result: any = await HrAbsence.findOne({
      attributes: [[fn('COALESCE', fn('SUM', col('accrual_impact_days')), 0), 'total']],
      where: { employee_id: employeeId, type: { [Op.in]: types as string[] }, start_date: { [Op.gte]: sinceDate } },
      raw: true,
      transaction: transaction as any,
    });
    return Number(result?.total ?? 0);
  }
}

export = SequelizeAbsenceRepository;
