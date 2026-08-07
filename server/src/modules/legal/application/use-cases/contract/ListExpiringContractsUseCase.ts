/**
 * Caso de uso: listagem de contratos com vencimento próximo (ou já vencidos,
 * ainda não `terminated`), cobrindo o fluxo do endpoint
 * `GET /api/legal/contracts/expiring`. É o caso de uso central do spec de
 * Contratos (`docs/juridico/01-CONTRATOS.md`): gestão de prazos.
 *
 * @module modules/legal/application/use-cases/contract/ListExpiringContractsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ContractRepository from '../../../domain/repositories/ContractRepository';

type ListExpiringContractsInput = { days?: number };

class ListExpiringContractsUseCase extends UseCase<ListExpiringContractsInput, any> {
  private readonly contractRepository: ContractRepository;

  constructor(contractRepository: ContractRepository) {
    super();
    this.contractRepository = contractRepository;
  }

  async execute({ days = 30 }: ListExpiringContractsInput = {}) {
    return this.contractRepository.listExpiringContracts(days);
  }
}

export = ListExpiringContractsUseCase;
