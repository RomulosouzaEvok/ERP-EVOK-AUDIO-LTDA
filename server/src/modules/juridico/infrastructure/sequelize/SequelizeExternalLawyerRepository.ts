/**
 * Implementação Sequelize do repositório de `JurExternalLawyer`.
 *
 * @module modules/juridico/infrastructure/sequelize/SequelizeExternalLawyerRepository
 */

import ExternalLawyerRepository from '../../domain/repositories/ExternalLawyerRepository';

const { JurExternalLawyer }: any = require('../../../../models/index');

class SequelizeExternalLawyerRepository extends ExternalLawyerRepository {
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const where: Record<string, unknown> = {};
    if (filters.active !== undefined) where.active = filters.active === 'true' || filters.active === true;
    if (filters.oab) where.oab_number = filters.oab;
    return JurExternalLawyer.findAndCountAll({ where, limit: pagination.limit, offset: pagination.offset, order: [['full_name', 'ASC']] });
  }

  public async findById(id: number | string): Promise<any | null> {
    return JurExternalLawyer.findByPk(id);
  }

  public async create(data: Record<string, unknown>): Promise<any> {
    return JurExternalLawyer.create(data);
  }

  public async update(id: number | string, data: Record<string, unknown>): Promise<any | null> {
    const lawyer = await JurExternalLawyer.findByPk(id);
    if (!lawyer) return null;
    await lawyer.update(data);
    return lawyer;
  }
}

export = SequelizeExternalLawyerRepository;
