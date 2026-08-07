/**
 * Contrato do repositório de `ti_settings` (parametrização singleton,
 * RF-TI-046/RNF-TI-05).
 *
 * @module modules/ti/domain/repositories/TiSettingsRepository
 */

class TiSettingsRepository {
  /** Retorna a linha única `id=1`, criando-a com os defaults do schema se ainda não existir (seed idempotente). */
  public async get(): Promise<any> {
    throw new Error('TiSettingsRepository.get não implementado.');
  }
}

export = TiSettingsRepository;
