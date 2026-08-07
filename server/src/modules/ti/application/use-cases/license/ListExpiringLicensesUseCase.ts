/**
 * `GET /api/ti/licenses/expiring` — alerta consolidado, janelas
 * parametrizáveis em `ti_settings` (RF-TI-028).
 *
 * @module modules/ti/application/use-cases/license/ListExpiringLicensesUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LicenseRepository from '../../../domain/repositories/LicenseRepository';
import TiSettingsRepository from '../../../domain/repositories/TiSettingsRepository';

class ListExpiringLicensesUseCase extends UseCase<void, any[]> {
  private readonly repository: LicenseRepository;
  private readonly settingsRepository: TiSettingsRepository;

  public constructor(repository: LicenseRepository, settingsRepository: TiSettingsRepository) {
    super();
    this.repository = repository;
    this.settingsRepository = settingsRepository;
  }

  public async execute(): Promise<any[]> {
    const settings = await this.settingsRepository.get();
    const windows = [settings.license_alert_window_days_1, settings.license_alert_window_days_2, settings.license_alert_window_days_3];
    const details = await this.repository.listExpiring(windows);
    const today = new Date();

    return details
      .map((detail: any) => {
        const asset = detail.asset ?? {};
        if (!asset.license_expires_at) return null;
        const expiresAt = new Date(asset.license_expires_at);
        const daysRemaining = Math.ceil((expiresAt.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
        const alertWindow = windows.filter((w) => daysRemaining <= w).sort((a, b) => a - b)[0] ?? Math.max(...windows);
        return { asset_id: detail.asset_id, name: asset.name, license_expires_at: asset.license_expires_at, days_remaining: daysRemaining, alert_window: alertWindow };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }
}

export = ListExpiringLicensesUseCase;
