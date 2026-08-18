/**
 * Retorna o singleton de configuracao de custeio de producao.
 *
 * @module modules/production/application/use-cases/GetProductionCostSettingsUseCase
 */

const UseCase = require('../../../../shared/application/UseCase');

class GetProductionCostSettingsUseCase extends UseCase {
  constructor(private readonly repository: any) {
    super();
  }

  async execute() {
    return this.repository.get();
  }
}

module.exports = GetProductionCostSettingsUseCase;
