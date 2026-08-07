/**
 * Caso de uso: listagem paginada de aditivos contratuais, cobrindo o fluxo
 * do endpoint `GET /api/legal/contract-addendums`.
 *
 * @module modules/legal/application/use-cases/addendum/ListAddendumsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ContractAddendumRepository from '../../../domain/repositories/ContractAddendumRepository';

type ListAddendumsInput = { contract_id?: number; page?: number; limit?: number; offset?: number };

class ListAddendumsUseCase extends UseCase<ListAddendumsInput, any> {
  private readonly addendumRepository: ContractAddendumRepository;

  constructor(addendumRepository: ContractAddendumRepository) {
    super();
    this.addendumRepository = addendumRepository;
  }

  async execute({ contract_id, page = 1, limit = 20, offset = 0 }: ListAddendumsInput = {}) {
    const { rows, count } = await this.addendumRepository.listAddendums({ contract_id }, { limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListAddendumsUseCase;
