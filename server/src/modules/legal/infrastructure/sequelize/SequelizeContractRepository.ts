/**
 * Implementação Sequelize/PostgreSQL do {@link ContractRepository}.
 *
 * @module modules/legal/infrastructure/sequelize/SequelizeContractRepository
 */

const { Op } = require('sequelize');
const ContractRepository = require('../../domain/repositories/ContractRepository');
const { LegalContract } = require('../../../../models/index');

class SequelizeContractRepository extends ContractRepository {
  async listContracts(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.contract_type) where.contract_type = filters.contract_type;

    const { count, rows } = await LegalContract.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['created_at', 'DESC']],
    });

    return { rows, count };
  }

  async findContractById(id: number) {
    return LegalContract.findByPk(id);
  }

  async findContractByNumber(contractNumber: string) {
    return LegalContract.findOne({ where: { contract_number: contractNumber } });
  }

  async createContract(data: Record<string, unknown>) {
    return LegalContract.create(data);
  }

  async updateContract(id: number, data: Record<string, unknown>) {
    const contract = await LegalContract.findByPk(id);
    if (!contract) return null;
    await contract.update(data);
    return contract;
  }

  async listExpiringContracts(days: number) {
    const today = new Date();
    const limit = new Date();
    limit.setDate(today.getDate() + days);

    return LegalContract.findAll({
      where: {
        end_date: { [Op.ne]: null, [Op.lte]: limit.toISOString().slice(0, 10) },
        status: { [Op.notIn]: ['terminated'] },
      },
      order: [['end_date', 'ASC']],
    });
  }
}

export = SequelizeContractRepository;
