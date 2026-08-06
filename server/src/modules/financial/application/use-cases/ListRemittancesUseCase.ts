import type { ICnabRepository } from '../../domain/repositories/CnabRepository';

const UseCase = require('../../../../shared/application/UseCase');

/** Query de paginação de `ListRemittancesUseCase.execute`. */
interface ListRemittancesInput {
  page?: number;
  limit?: number;
}

/** Lista remessas CNAB geradas, paginadas (sem o conteúdo do arquivo — ver `GetRemittanceUseCase` para o download). */
class ListRemittancesUseCase extends UseCase {
  cnabRepository: ICnabRepository;

  constructor(cnabRepository: ICnabRepository) {
    super();
    this.cnabRepository = cnabRepository;
  }

  /** @param {ListRemittancesInput} input */
  async execute({ page = 1, limit = 20 }: ListRemittancesInput = {}) {
    const offset = (page - 1) * limit;
    const { rows, count } = await this.cnabRepository.listRemittances({ limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

module.exports = ListRemittancesUseCase;
