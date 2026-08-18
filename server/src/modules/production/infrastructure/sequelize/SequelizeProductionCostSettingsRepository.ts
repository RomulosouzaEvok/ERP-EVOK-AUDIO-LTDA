/**
 * Implementacao Sequelize do singleton `production_cost_settings`.
 *
 * @module modules/production/infrastructure/sequelize/SequelizeProductionCostSettingsRepository
 */

const ProductionCostSettingsRepository = require('../../domain/repositories/ProductionCostSettingsRepository');
const { ProductionCostSettings }: any = require('../../../../models/index');

class SequelizeProductionCostSettingsRepository extends ProductionCostSettingsRepository {
  /** @inheritdoc */
  async get(options?: Record<string, unknown>) {
    const [settings] = await ProductionCostSettings.findOrCreate({
      where: { id: 1 },
      defaults: { id: 1 },
      ...options,
    });
    return settings;
  }

  /** @inheritdoc */
  async upsert(data: Record<string, unknown>, options?: Record<string, unknown>) {
    const [settings] = await ProductionCostSettings.findOrCreate({
      where: { id: 1 },
      defaults: { id: 1 },
      ...options,
    });

    Object.assign(settings, data);
    await settings.save(options);
    return settings;
  }
}

module.exports = SequelizeProductionCostSettingsRepository;
