/**
 * Implementação Sequelize do {@link VisitorRepository}.
 *
 * @module modules/facilities/infrastructure/sequelize/SequelizeVisitorRepository
 */

import { Op } from 'sequelize';
import VisitorRepository from '../../domain/repositories/VisitorRepository';

const { FacilityVisitor }: any = require('../../../../models/index');

class SequelizeVisitorRepository extends VisitorRepository {
  async list(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${filters.search}%` } },
        { document: { [Op.iLike]: `%${filters.search}%` } },
      ];
    }
    return FacilityVisitor.findAndCountAll({ where, limit: pagination.limit, offset: pagination.offset, order: [['name', 'ASC']] });
  }

  async findByDocument(document: string) {
    return FacilityVisitor.findOne({ where: { document } });
  }

  async findById(id: number) {
    return FacilityVisitor.findByPk(id);
  }

  async create(data: Record<string, unknown>) {
    return FacilityVisitor.create(data);
  }
}

export = SequelizeVisitorRepository;
