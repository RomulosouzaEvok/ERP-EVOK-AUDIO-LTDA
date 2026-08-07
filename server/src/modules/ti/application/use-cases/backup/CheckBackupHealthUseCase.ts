/**
 * `GET /api/ti/backup-logs/health` — painel de saúde de backup
 * (RF-TI-041/042, RNF-TI-04), parametrizado por `ti_settings`.
 *
 * @module modules/ti/application/use-cases/backup/CheckBackupHealthUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import BackupLogRepository from '../../../domain/repositories/BackupLogRepository';
import TiSettingsRepository from '../../../domain/repositories/TiSettingsRepository';

interface Output {
  last_daily_success_at: string | null;
  hours_since_last_daily: number | null;
  daily_alert: boolean;
  last_restore_test_at: string | null;
  days_since_last_restore_test: number | null;
  restore_test_alert: boolean;
}

class CheckBackupHealthUseCase extends UseCase<void, Output> {
  private readonly repository: BackupLogRepository;
  private readonly settingsRepository: TiSettingsRepository;

  public constructor(repository: BackupLogRepository, settingsRepository: TiSettingsRepository) {
    super();
    this.repository = repository;
    this.settingsRepository = settingsRepository;
  }

  public async execute(): Promise<Output> {
    const settings = await this.settingsRepository.get();
    const now = Date.now();

    const lastDaily = await this.repository.findLastSuccessByType('daily');
    const hoursSinceLastDaily = lastDaily ? Math.round((now - new Date(lastDaily.executed_at).getTime()) / 3_600_000) : null;
    const dailyAlert = hoursSinceLastDaily === null || hoursSinceLastDaily > settings.backup_daily_alert_hours;

    const lastRestoreTest = await this.repository.findLastSuccessByType('restore_test');
    const daysSinceLastRestoreTest = lastRestoreTest ? Math.round((now - new Date(lastRestoreTest.executed_at).getTime()) / 86_400_000) : null;
    const restoreTestAlert = daysSinceLastRestoreTest === null || daysSinceLastRestoreTest > settings.restore_test_max_interval_days;

    return {
      last_daily_success_at: lastDaily ? lastDaily.executed_at : null,
      hours_since_last_daily: hoursSinceLastDaily,
      daily_alert: dailyAlert,
      last_restore_test_at: lastRestoreTest ? lastRestoreTest.executed_at : null,
      days_since_last_restore_test: daysSinceLastRestoreTest,
      restore_test_alert: restoreTestAlert,
    };
  }
}

export = CheckBackupHealthUseCase;
