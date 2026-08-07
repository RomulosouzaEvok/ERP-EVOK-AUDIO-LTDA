/**
 * Implementação Sequelize do repositório de ItBackupLog.
 *
 * @module modules/ti/infrastructure/sequelize/SequelizeBackupLogRepository
 */

import BackupLogRepository from '../../domain/repositories/BackupLogRepository';

const { ItBackupLog }: any = require('../../../../models/index');

class SequelizeBackupLogRepository extends BackupLogRepository {
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const { Op } = require('sequelize');
    const where: Record<string, unknown> = {};
    if (filters.backup_type) where.backup_type = filters.backup_type;
    if (filters.success !== undefined) where.success = filters.success === 'true' || filters.success === true;
    if (filters.start_date || filters.end_date) {
      where.executed_at = {};
      if (filters.start_date) (where.executed_at as any)[Op.gte] = filters.start_date;
      if (filters.end_date) (where.executed_at as any)[Op.lte] = filters.end_date;
    }
    return ItBackupLog.findAndCountAll({ where, limit: pagination.limit, offset: pagination.offset, order: [['executed_at', 'DESC']] });
  }

  public async create(data: Record<string, unknown>): Promise<any> {
    return ItBackupLog.create(data);
  }

  public async findLastSuccessByType(backupType: string): Promise<any | null> {
    return ItBackupLog.findOne({ where: { backup_type: backupType, success: true }, order: [['executed_at', 'DESC']] });
  }
}

export = SequelizeBackupLogRepository;
