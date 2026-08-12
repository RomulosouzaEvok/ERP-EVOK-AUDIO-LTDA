/**
 * Implementação Sequelize do repositório de `HrEmployeeBenefit`.
 * @module modules/rh/infrastructure/sequelize/SequelizeEmployeeBenefitRepository
 */
import EmployeeBenefitRepository from '../../domain/repositories/EmployeeBenefitRepository';

const { HrEmployeeBenefit, HrBenefitType, Employee, Department }: any = require('../../../../models/index');

class SequelizeEmployeeBenefitRepository extends EmployeeBenefitRepository {
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }) {
    const where: Record<string, unknown> = {};
    if (filters.employee_id) where.employee_id = filters.employee_id;
    if (filters.benefit_type_id) where.benefit_type_id = filters.benefit_type_id;
    if (filters.enrollment_status) where.enrollment_status = filters.enrollment_status;
    return HrEmployeeBenefit.findAndCountAll({
      where,
      include: [{ model: HrBenefitType, as: 'benefitType' }],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['enrolled_at', 'DESC']],
    });
  }

  public async findById(id: number | string) {
    return HrEmployeeBenefit.findByPk(id, { include: [{ model: HrBenefitType, as: 'benefitType' }] });
  }

  public async create(data: Record<string, unknown>, transaction?: unknown) {
    return HrEmployeeBenefit.create(data, { transaction: transaction as any });
  }

  public async update(id: number | string, data: Record<string, unknown>, transaction?: unknown) {
    const record = await HrEmployeeBenefit.findByPk(id, { transaction: transaction as any });
    if (!record) return null;
    await record.update(data, { transaction: transaction as any });
    return record;
  }

  public async findActiveByEmployeeAndType(employeeId: number | string, benefitTypeId: number | string) {
    return HrEmployeeBenefit.findOne({
      where: { employee_id: employeeId, benefit_type_id: benefitTypeId, enrollment_status: 'ativo' },
    });
  }

  public async listActiveByEmployee(employeeId: number | string, transaction?: unknown) {
    return HrEmployeeBenefit.findAll({
      where: { employee_id: employeeId, enrollment_status: 'ativo' },
      include: [{ model: HrBenefitType, as: 'benefitType' }],
      transaction: transaction as any,
    });
  }

  public async listActiveForCompetence(monthStart: string, monthEnd: string) {
    const { Op } = require('sequelize');
    return HrEmployeeBenefit.findAll({
      where: {
        enrolled_at: { [Op.lte]: monthEnd },
        [Op.or]: [{ canceled_at: { [Op.is]: null } }, { canceled_at: { [Op.gte]: monthStart } }],
      },
      include: [
        { model: HrBenefitType, as: 'benefitType' },
        { model: Employee, as: 'employee', include: [{ model: Department, as: 'department' }] },
      ],
    });
  }
}

export = SequelizeEmployeeBenefitRepository;
