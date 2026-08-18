/**
 * Contrato de repositorio do singleton `production_cost_settings`.
 *
 * A camada de aplicacao depende apenas desta interface, nunca do Sequelize
 * diretamente.
 *
 * @module modules/production/domain/repositories/ProductionCostSettingsRepository
 */

class ProductionCostSettingsRepository {
  /**
   * Busca a linha singleton `id=1`, criando-a com os defaults do schema se
   * ainda nao existir.
   *
   * @abstract
   * @param options - Transacao Sequelize opcional.
   * @returns Linha singleton de configuracao de custeio.
   */
  async get(_options?: Record<string, unknown>): Promise<any> {
    throw new Error('ProductionCostSettingsRepository.get nao implementado.');
  }

  /**
   * Cria (se necessario) ou atualiza a linha singleton `id=1`.
   *
   * @abstract
   * @param data - Campos permitidos para persistencia.
   * @param options - Transacao Sequelize opcional.
   * @returns Linha singleton persistida.
   */
  async upsert(_data: Record<string, unknown>, _options?: Record<string, unknown>): Promise<any> {
    throw new Error('ProductionCostSettingsRepository.upsert nao implementado.');
  }
}

export = ProductionCostSettingsRepository;
