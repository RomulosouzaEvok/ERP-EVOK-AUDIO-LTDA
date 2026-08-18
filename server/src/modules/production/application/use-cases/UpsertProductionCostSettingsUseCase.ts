/**
 * Cria/atualiza o singleton de configuracao de custeio de producao.
 *
 * @module modules/production/application/use-cases/UpsertProductionCostSettingsUseCase
 */

const UseCase = require('../../../../shared/application/UseCase');

const ALLOWED_FIELDS = [
  'overhead_calculation_basis',
  'overhead_rate_percent',
  'default_labor_rate_per_hour',
];

class UpsertProductionCostSettingsUseCase extends UseCase {
  constructor(private readonly repository: any) {
    super();
  }

  async execute(input: Record<string, unknown>) {
    const data: Record<string, unknown> = {};

    for (const field of ALLOWED_FIELDS) {
      if (input[field] !== undefined) {
        data[field] = input[field];
      }
    }

    return this.repository.upsert(data);
  }
}

module.exports = UpsertProductionCostSettingsUseCase;
