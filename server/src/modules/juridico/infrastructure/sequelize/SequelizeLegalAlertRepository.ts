/**
 * Implementação Sequelize do repositório de `JurLegalAlert`.
 *
 * @module modules/juridico/infrastructure/sequelize/SequelizeLegalAlertRepository
 */

import LegalAlertRepository from '../../domain/repositories/LegalAlertRepository';

const { JurLegalAlert }: any = require('../../../../models/index');

class SequelizeLegalAlertRepository extends LegalAlertRepository {
  public async create(data: Record<string, unknown>): Promise<any> {
    return JurLegalAlert.create(data);
  }

  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const where: Record<string, unknown> = {};
    if (filters.origin_type) where.origin_type = filters.origin_type;
    if (filters.status) where.status = filters.status;
    if (filters.responsible_user_id) where.recipient_user_id = filters.responsible_user_id;

    return JurLegalAlert.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['due_date', 'ASC']],
    });
  }

  public async findById(id: number | string): Promise<any | null> {
    return JurLegalAlert.findByPk(id);
  }

  public async update(id: number | string, data: Record<string, unknown>): Promise<any | null> {
    const alert = await JurLegalAlert.findByPk(id);
    if (!alert) return null;
    await alert.update(data);
    return alert;
  }
}

export = SequelizeLegalAlertRepository;
