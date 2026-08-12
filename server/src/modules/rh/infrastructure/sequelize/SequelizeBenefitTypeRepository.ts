/**
 * Implementação Sequelize do repositório de `HrBenefitType`.
 * @module modules/rh/infrastructure/sequelize/SequelizeBenefitTypeRepository
 */
import BenefitTypeRepository from '../../domain/repositories/BenefitTypeRepository';

const { HrBenefitType }: any = require('../../../../models/index');

class SequelizeBenefitTypeRepository extends BenefitTypeRepository {
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }) {
    const where: Record<string, unknown> = {};
    if (filters.category) where.category = filters.category;
    if (filters.active !== undefined) where.active = filters.active;
    return HrBenefitType.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['name', 'ASC']],
    });
  }

  public async findById(id: number | string) {
    return HrBenefitType.findByPk(id);
  }

  public async create(data: Record<string, unknown>) {
    return HrBenefitType.create(data);
  }

  public async update(id: number | string, data: Record<string, unknown>) {
    const record = await HrBenefitType.findByPk(id);
    if (!record) return null;
    await record.update(data);
    return record;
  }
}

export = SequelizeBenefitTypeRepository;
