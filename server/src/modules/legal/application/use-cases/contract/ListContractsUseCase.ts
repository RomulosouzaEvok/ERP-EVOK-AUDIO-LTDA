/**
 * Caso de uso: listagem paginada de contratos, cobrindo o fluxo do endpoint
 * `GET /api/legal/contracts`.
 *
 * @module modules/legal/application/use-cases/contract/ListContractsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ContractRepository from '../../../domain/repositories/ContractRepository';

type ListContractsInput = {
  status?: string;
  contract_type?: string;
  page?: number;
  limit?: number;
  offset?: number;
};

class ListContractsUseCase extends UseCase<ListContractsInput, any> {
  private readonly contractRepository: ContractRepository;

  constructor(contractRepository: ContractRepository) {
    super();
    this.contractRepository = contractRepository;
  }

  async execute({ status, contract_type, page = 1, limit = 20, offset = 0 }: ListContractsInput = {}) {
    const { rows, count } = await this.contractRepository.listContracts({ status, contract_type }, { limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListContractsUseCase;
