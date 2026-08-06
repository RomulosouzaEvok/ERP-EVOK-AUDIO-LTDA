import type { ICnabRepository } from '../../domain/repositories/CnabRepository';

const UseCase = require('../../../../shared/application/UseCase');

/**
 * Busca a configuração bancária singleton da empresa (dados usados na
 * geração de remessa CNAB). Retorna `null` se ainda não configurada — o
 * controller decide como sinalizar isso ao cliente (204/objeto vazio).
 */
class GetBankingConfigUseCase extends UseCase {
  cnabRepository: ICnabRepository;

  constructor(cnabRepository: ICnabRepository) {
    super();
    this.cnabRepository = cnabRepository;
  }

  /** @returns {Promise<Object|null>} */
  async execute() {
    return this.cnabRepository.findBankingConfig();
  }
}

module.exports = GetBankingConfigUseCase;
