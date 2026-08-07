/**
 * Contrato do repositório de ItBackupLog (P5).
 *
 * @module modules/ti/domain/repositories/BackupLogRepository
 */

class BackupLogRepository {
  public async findAndCount(_filters: Record<string, unknown>, _pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    throw new Error('BackupLogRepository.findAndCount não implementado.');
  }
  public async create(_data: Record<string, unknown>): Promise<any> {
    throw new Error('BackupLogRepository.create não implementado.');
  }
  public async findLastSuccessByType(_backupType: string): Promise<any | null> {
    throw new Error('BackupLogRepository.findLastSuccessByType não implementado.');
  }
}

export = BackupLogRepository;
