/**
 * Implementação Sequelize do repositório de `ti_settings` (singleton).
 *
 * @module modules/ti/infrastructure/sequelize/SequelizeTiSettingsRepository
 */

import TiSettingsRepository from '../../domain/repositories/TiSettingsRepository';

const { TiSettings }: any = require('../../../../models/index');

class SequelizeTiSettingsRepository extends TiSettingsRepository {
  /** @inheritdoc — cria a linha `id=1` com os defaults do schema na primeira leitura (seed idempotente). */
  public async get(): Promise<any> {
    const [settings] = await TiSettings.findOrCreate({ where: { id: 1 }, defaults: { id: 1 } });
    return settings;
  }
}

export = SequelizeTiSettingsRepository;
