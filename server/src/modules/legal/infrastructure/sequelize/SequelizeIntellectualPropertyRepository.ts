/**
 * Implementação Sequelize/PostgreSQL do {@link IntellectualPropertyRepository}.
 *
 * @module modules/legal/infrastructure/sequelize/SequelizeIntellectualPropertyRepository
 */

const { Op } = require('sequelize');
const IntellectualPropertyRepository = require('../../domain/repositories/IntellectualPropertyRepository');
const { LegalIntellectualProperty } = require('../../../../models/index');

class SequelizeIntellectualPropertyRepository extends IntellectualPropertyRepository {
  async listIntellectualProperty(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.ip_type) where.ip_type = filters.ip_type;
    if (filters.status) where.status = filters.status;

    const { count, rows } = await LegalIntellectualProperty.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['created_at', 'DESC']],
    });

    return { rows, count };
  }

  async findIntellectualPropertyById(id: number) {
    return LegalIntellectualProperty.findByPk(id);
  }

  async createIntellectualProperty(data: Record<string, unknown>) {
    return LegalIntellectualProperty.create(data);
  }

  async updateIntellectualProperty(id: number, data: Record<string, unknown>) {
    const ip = await LegalIntellectualProperty.findByPk(id);
    if (!ip) return null;
    await ip.update(data);
    return ip;
  }

  async listExpiringIntellectualProperty(days: number) {
    const today = new Date();
    const limit = new Date();
    limit.setDate(today.getDate() + days);

    return LegalIntellectualProperty.findAll({
      where: {
        expiration_date: { [Op.ne]: null, [Op.lte]: limit.toISOString().slice(0, 10) },
        status: { [Op.notIn]: ['expired', 'abandoned'] },
      },
      order: [['expiration_date', 'ASC']],
    });
  }
}

export = SequelizeIntellectualPropertyRepository;
