/**
 * Implementação Sequelize do repositório de `JurCorporateAct` (RF-JUR-030).
 *
 * @module modules/juridico/infrastructure/sequelize/SequelizeCorporateActRepository
 */

import CorporateActRepository from '../../domain/repositories/CorporateActRepository';

const { JurCorporateAct }: any = require('../../../../models/index');

class SequelizeCorporateActRepository extends CorporateActRepository {
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const where: Record<string, unknown> = {};
    if (filters.act_type) where.act_type = filters.act_type;
    if (filters.status) where.status = filters.status;

    return JurCorporateAct.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['act_date', 'DESC']],
    });
  }

  public async findById(id: number | string): Promise<any | null> {
    return JurCorporateAct.findByPk(id);
  }

  public async create(data: Record<string, unknown>): Promise<any> {
    return JurCorporateAct.create(data);
  }

  public async update(id: number | string, data: Record<string, unknown>): Promise<any | null> {
    const act = await JurCorporateAct.findByPk(id);
    if (!act) return null;
    await act.update(data);
    return act;
  }
}

export = SequelizeCorporateActRepository;
