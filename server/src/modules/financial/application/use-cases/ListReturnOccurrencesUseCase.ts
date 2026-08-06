import type { ICnabRepository } from '../../domain/repositories/CnabRepository';

const UseCase = require('../../../../shared/application/UseCase');

/** Lista as ocorrências (linhas do retorno) de um `CnabReturnFile` já processado. */
class ListReturnOccurrencesUseCase extends UseCase {
  cnabRepository: ICnabRepository;

  constructor(cnabRepository: ICnabRepository) {
    super();
    this.cnabRepository = cnabRepository;
  }

  /** @param {{ returnFileId: number|string }} input */
  async execute({ returnFileId }: { returnFileId: number | string }) {
    return this.cnabRepository.listOccurrencesByReturnFile(returnFileId);
  }
}

module.exports = ListReturnOccurrencesUseCase;
