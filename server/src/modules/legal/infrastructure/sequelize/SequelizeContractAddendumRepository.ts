/**
 * Implementação Sequelize/PostgreSQL do {@link ContractAddendumRepository}.
 *
 * @module modules/legal/infrastructure/sequelize/SequelizeContractAddendumRepository
 */

const ContractAddendumRepository = require('../../domain/repositories/ContractAddendumRepository');
const { LegalContractAddendum } = require('../../../../models/index');

class SequelizeContractAddendumRepository extends ContractAddendumRepository {
  async listAddendums(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.contract_id) where.contract_id = filters.contract_id;

    const { count, rows } = await LegalContractAddendum.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['addendum_number', 'ASC']],
    });

    return { rows, count };
  }

  async findAddendumById(id: number) {
    return LegalContractAddendum.findByPk(id);
  }

  async createAddendum(data: Record<string, unknown>) {
    return LegalContractAddendum.create(data);
  }

  async updateAddendum(id: number, data: Record<string, unknown>) {
    const addendum = await LegalContractAddendum.findByPk(id);
    if (!addendum) return null;
    await addendum.update(data);
    return addendum;
  }
}

export = SequelizeContractAddendumRepository;
