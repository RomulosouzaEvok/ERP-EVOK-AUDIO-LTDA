import type FiscalRepository = require('../../domain/repositories/FiscalRepository');

const UseCase = require('../../../../shared/application/UseCase');

const ALLOWED_FIELDS = [
  'legal_name', 'trade_name', 'cnpj', 'ie', 'im', 'crt', 'cnae',
  'cep', 'street', 'number', 'complement', 'neighborhood', 'city', 'city_ibge_code', 'state',
  'nfe_series', 'nfe_environment', 'nfe_provider',
];

/**
 * Cria (se ainda não existir) ou atualiza a configuração fiscal da empresa
 * (singleton, id=1). `nfe_next_number` nunca é aceito neste use case — é
 * controlado exclusivamente por `IssueSaleNfeUseCase` para evitar reuso
 * acidental de numeração.
 */
class UpsertCompanyFiscalConfigUseCase extends UseCase {
  private fiscalRepository: FiscalRepository;

  /** @param {import('../../domain/repositories/FiscalRepository')} fiscalRepository */
  constructor(fiscalRepository: FiscalRepository) {
    super();
    this.fiscalRepository = fiscalRepository;
  }

  async execute(input: Record<string, unknown>) {
    const data: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (input[field] !== undefined) data[field] = input[field];
    }

    return this.fiscalRepository.upsertCompanyFiscalConfig(data);
  }
}

module.exports = UpsertCompanyFiscalConfigUseCase;
