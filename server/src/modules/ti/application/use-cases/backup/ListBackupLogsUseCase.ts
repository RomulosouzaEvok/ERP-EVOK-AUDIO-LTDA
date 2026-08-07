/**
 * `GET /api/ti/backup-logs` — lista (filtros: `backup_type`, `success`,
 * `start_date`, `end_date`).
 *
 * @module modules/ti/application/use-cases/backup/ListBackupLogsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import BackupLogRepository from '../../../domain/repositories/BackupLogRepository';
import { toBackupLogDTO } from '../../../infrastructure/mappers/BackupLogMapper';

interface Input {
  filters: Record<string, unknown>;
  page: number;
  limit: number;
}

class ListBackupLogsUseCase extends UseCase<Input, any> {
  private readonly repository: BackupLogRepository;

  public constructor(repository: BackupLogRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ filters, page, limit }: Input): Promise<{ rows: unknown[]; total: number; page: number; limit: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    const { count, rows } = await this.repository.findAndCount(filters, { limit, offset });
    return { rows: rows.map(toBackupLogDTO), total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListBackupLogsUseCase;
