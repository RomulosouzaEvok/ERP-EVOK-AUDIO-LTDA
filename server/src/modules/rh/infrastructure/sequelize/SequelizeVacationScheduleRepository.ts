/**
 * Implementação Sequelize do repositório de `HrVacationSchedule`.
 * @module modules/rh/infrastructure/sequelize/SequelizeVacationScheduleRepository
 */
import VacationScheduleRepository from '../../domain/repositories/VacationScheduleRepository';

const { HrVacationSchedule, HrVacationAccrualPeriod, Employee }: any = require('../../../../models/index');

const ACTIVE_SCHEDULE_STATUSES = ['planejado', 'confirmado', 'em_gozo', 'concluido'];

class SequelizeVacationScheduleRepository extends VacationScheduleRepository {
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }) {
    const where: Record<string, unknown> = {};
    if (filters.accrual_period_id) where.accrual_period_id = filters.accrual_period_id;
    const include: any[] = [];
    if (filters.employee_id || filters.department_id) {
      const accrualWhere: Record<string, unknown> = {};
      if (filters.employee_id) accrualWhere.employee_id = filters.employee_id;
      const employeeInclude: any = { model: Employee, as: 'employee' };
      if (filters.department_id) employeeInclude.where = { department_id: filters.department_id };
      include.push({ model: HrVacationAccrualPeriod, as: 'accrualPeriod', where: accrualWhere, include: [employeeInclude] });
    }
    return HrVacationSchedule.findAndCountAll({
      where,
      include,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['start_date', 'DESC']],
    });
  }

  public async findById(id: number | string) {
    return HrVacationSchedule.findByPk(id);
  }

  public async create(data: Record<string, unknown>, transaction?: unknown) {
    return HrVacationSchedule.create(data, { transaction: transaction as any });
  }

  public async update(id: number | string, data: Record<string, unknown>, transaction?: unknown) {
    const record = await HrVacationSchedule.findByPk(id, { transaction: transaction as any });
    if (!record) return null;
    await record.update(data, { transaction: transaction as any });
    return record;
  }

  public async listActiveByAccrualPeriod(accrualPeriodId: number | string) {
    const { Op } = require('sequelize');
    return HrVacationSchedule.findAll({
      where: { accrual_period_id: accrualPeriodId, status: { [Op.in]: ACTIVE_SCHEDULE_STATUSES } },
    });
  }

  public async listOverlappingByDepartment(departmentId: number | string | null, startDate: string, endDate: string) {
    const { Op } = require('sequelize');
    // `departmentId === null` → calendário geral (todos os departamentos,
    // `GET /vacation-schedules/calendar` sem filtro), sem `where` no include.
    const employeeInclude: any = { model: Employee, as: 'employee', required: true };
    if (departmentId !== null && departmentId !== undefined) {
      employeeInclude.where = { department_id: departmentId };
    }
    return HrVacationSchedule.findAll({
      where: {
        status: { [Op.in]: ACTIVE_SCHEDULE_STATUSES },
        start_date: { [Op.lt]: endDate },
      },
      include: [
        {
          model: HrVacationAccrualPeriod,
          as: 'accrualPeriod',
          required: true,
          include: [employeeInclude],
        },
      ],
    }).then((rows: any[]) => rows.filter((row) => {
      const rowEnd = new Date(row.start_date);
      rowEnd.setDate(rowEnd.getDate() + row.days);
      return rowEnd.toISOString().slice(0, 10) > startDate;
    }));
  }
}

export = SequelizeVacationScheduleRepository;
