/**
 * Implementação Sequelize do repositório de `HrEmployeeContract`.
 * @module modules/rh/infrastructure/sequelize/SequelizeEmployeeContractRepository
 */
import EmployeeContractRepository from '../../domain/repositories/EmployeeContractRepository';

const { HrEmployeeContract }: any = require('../../../../models/index');

const OPEN_CONTRACT_STATUSES = ['ativo', 'prorrogado'];

class SequelizeEmployeeContractRepository extends EmployeeContractRepository {
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }) {
    const where: Record<string, unknown> = {};
    if (filters.employee_id) where.employee_id = filters.employee_id;
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    return HrEmployeeContract.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']],
    });
  }

  public async findById(id: number | string) {
    return HrEmployeeContract.findByPk(id);
  }

  public async findOpenByEmployeeId(employeeId: number | string) {
    const { Op } = require('sequelize');
    return HrEmployeeContract.findOne({
      where: { employee_id: employeeId, status: { [Op.in]: OPEN_CONTRACT_STATUSES } },
      order: [['createdAt', 'DESC']],
    });
  }

  public async create(data: Record<string, unknown>, transaction?: unknown) {
    return HrEmployeeContract.create(data, { transaction: transaction as any });
  }

  public async update(id: number | string, data: Record<string, unknown>, transaction?: unknown) {
    const record = await HrEmployeeContract.findByPk(id, { transaction: transaction as any });
    if (!record) return null;
    await record.update(data, { transaction: transaction as any });
    return record;
  }

  public async findExpiredActiveExperienceContracts(today: string) {
    const { Op } = require('sequelize');
    return HrEmployeeContract.findAll({
      where: {
        type: 'experiencia',
        status: { [Op.in]: OPEN_CONTRACT_STATUSES },
        [Op.or]: [
          { period_2_end_date: { [Op.lt]: today } },
          { period_2_end_date: null, period_1_end_date: { [Op.lt]: today } },
        ],
      },
    });
  }
}

export = SequelizeEmployeeContractRepository;
