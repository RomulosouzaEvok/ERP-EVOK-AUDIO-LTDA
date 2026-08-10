/**
 * Implementação Sequelize do repositório de `HrEmployeeJobHistory`.
 * @module modules/rh/infrastructure/sequelize/SequelizeEmployeeJobHistoryRepository
 */
import EmployeeJobHistoryRepository from '../../domain/repositories/EmployeeJobHistoryRepository';

const { HrEmployeeJobHistory }: any = require('../../../../models/index');

class SequelizeEmployeeJobHistoryRepository extends EmployeeJobHistoryRepository {
  public async create(data: Record<string, unknown>, transaction?: unknown) {
    return HrEmployeeJobHistory.create(data, { transaction: transaction as any });
  }
}

export = SequelizeEmployeeJobHistoryRepository;
