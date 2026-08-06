import type { ICnabRepository } from '../../domain/repositories/CnabRepository';

const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');

/** Busca uma remessa CNAB pelo id (com `file_content`, para download/re-download). */
class GetRemittanceUseCase extends UseCase {
  cnabRepository: ICnabRepository;

  constructor(cnabRepository: ICnabRepository) {
    super();
    this.cnabRepository = cnabRepository;
  }

  /**
   * @param {{ id: number|string }} input
   * @throws {NotFoundError} Se a remessa não existir.
   */
  async execute({ id }: { id: number | string }) {
    const remittance = await this.cnabRepository.findRemittanceById(id);
    if (!remittance) throw new NotFoundError('Remessa CNAB não encontrada.');
    return remittance;
  }
}

module.exports = GetRemittanceUseCase;
