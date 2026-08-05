import type FiscalRepository = require('../../domain/repositories/FiscalRepository');

const UseCase = require('../../../../shared/application/UseCase');

/** Retorna a configuração fiscal da empresa (singleton, id=1), ou `null` se ainda não cadastrada. */
class GetCompanyFiscalConfigUseCase extends UseCase {
  private fiscalRepository: FiscalRepository;

  /** @param {import('../../domain/repositories/FiscalRepository')} fiscalRepository */
  constructor(fiscalRepository: FiscalRepository) {
    super();
    this.fiscalRepository = fiscalRepository;
  }

  async execute() {
    return this.fiscalRepository.findCompanyFiscalConfig();
  }
}

module.exports = GetCompanyFiscalConfigUseCase;
