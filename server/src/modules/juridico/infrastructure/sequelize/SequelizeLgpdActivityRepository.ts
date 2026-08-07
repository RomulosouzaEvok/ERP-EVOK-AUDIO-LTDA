/**
 * Implementação Sequelize do repositório de `JurLgpdProcessingActivity`
 * (RoPA — RF-JUR-035/036).
 *
 * @module modules/juridico/infrastructure/sequelize/SequelizeLgpdActivityRepository
 */

import LgpdActivityRepository from '../../domain/repositories/LgpdActivityRepository';

const { JurLgpdProcessingActivity }: any = require('../../../../models/index');

class SequelizeLgpdActivityRepository extends LgpdActivityRepository {
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const { Op } = require('sequelize');
    const where: Record<string, unknown> = {};
    if (filters.department_id) where.department_id = filters.department_id;
    if (filters.legal_basis) where.legal_basis = filters.legal_basis;
    if (filters.revisao_pendente === 'true' || filters.revisao_pendente === true) {
      where.next_review_due_at = { [Op.lte]: new Date().toISOString().slice(0, 10) };
    }

    return JurLgpdProcessingActivity.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']],
    });
  }

  public async findById(id: number | string): Promise<any | null> {
    return JurLgpdProcessingActivity.findByPk(id);
  }

  public async create(data: Record<string, unknown>): Promise<any> {
    return JurLgpdProcessingActivity.create(data);
  }

  public async update(id: number | string, data: Record<string, unknown>): Promise<any | null> {
    const activity = await JurLgpdProcessingActivity.findByPk(id);
    if (!activity) return null;
    await activity.update(data);
    return activity;
  }
}

export = SequelizeLgpdActivityRepository;
