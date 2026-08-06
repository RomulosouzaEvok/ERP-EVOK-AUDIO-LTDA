import type { ICnabRepository } from '../../domain/repositories/CnabRepository';

const UseCase = require('../../../../shared/application/UseCase');

/** Query de paginação de `ListReturnFilesUseCase.execute`. */
interface ListReturnFilesInput {
  page?: number;
  limit?: number;
}

/** Lista arquivos de retorno CNAB processados, paginados. */
class ListReturnFilesUseCase extends UseCase {
  cnabRepository: ICnabRepository;

  constructor(cnabRepository: ICnabRepository) {
    super();
    this.cnabRepository = cnabRepository;
  }

  /** @param {ListReturnFilesInput} input */
  async execute({ page = 1, limit = 20 }: ListReturnFilesInput = {}) {
    const offset = (page - 1) * limit;
    const { rows, count } = await this.cnabRepository.listReturnFiles({ limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

module.exports = ListReturnFilesUseCase;
