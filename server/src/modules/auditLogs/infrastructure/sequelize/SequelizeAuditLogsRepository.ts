/**
 * Implementacao Sequelize do repositorio de Logs de Auditoria.
 *
 * @module modules/auditLogs/infrastructure/sequelize/SequelizeAuditLogsRepository
 */

import AuditLogsRepository from '../../domain/repositories/AuditLogsRepository';
const { AuditLog, User }: any = require('../../../../models/index');
const { Op } = require('sequelize');

class SequelizeAuditLogsRepository extends AuditLogsRepository {
  /** @inheritdoc */
  public async findAndCountAll(
    filters: Record<string, unknown>,
    pagination: { limit: number; offset: number }
  ): Promise<{ count: number; rows: any[] }> {
    const { entity_type, entity_id, action, start_date, end_date } = filters as any;
    const where: any = {};
    if (entity_type) where.entity_type = entity_type;
    if (entity_id) where.entity_id = Number(entity_id);
    if (action) where.action = action;
    if (start_date || end_date) {
      where.createdAt = {};
      if (start_date) where.createdAt[Op.gte] = new Date(start_date as string);
      if (end_date) where.createdAt[Op.lte] = new Date(end_date as string);
    }
    return AuditLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']]
    });
  }

  /** @inheritdoc */
  public async findById(id: number | string): Promise<any | null> {
    return AuditLog.findByPk(id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
    });
  }
}

export = SequelizeAuditLogsRepository;
