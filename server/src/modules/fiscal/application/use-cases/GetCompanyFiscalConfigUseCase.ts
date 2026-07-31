const UseCase = require('../../../../shared/application/UseCase');
const { CompanyFiscalConfig } = require('../../../../models/index');

/** Retorna a configuração fiscal da empresa (singleton, id=1), ou `null` se ainda não cadastrada. */
class GetCompanyFiscalConfigUseCase extends UseCase {
  async execute() {
    return CompanyFiscalConfig.findByPk(1);
  }
}

module.exports = GetCompanyFiscalConfigUseCase;
