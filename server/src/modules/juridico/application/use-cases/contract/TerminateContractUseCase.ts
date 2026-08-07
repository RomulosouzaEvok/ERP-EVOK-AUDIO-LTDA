/**
 * `POST /api/jur/contracts/:id/terminate` — encerra o contrato (RF-JUR-009).
 * `terminated` exige `termination_reason`+data; nenhuma transição
 * `expired`/`terminated → active` é permitida por este ou qualquer outro
 * endpoint (BR-JUR-006) — enforcement de aplicação, reforçado por CHECK de
 * banco para o par razão/data.
 *
 * @module modules/juridico/application/use-cases/contract/TerminateContractUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ContractRepository from '../../../domain/repositories/ContractRepository';
import { ValidationError, NotFoundError } from '../../../../../errors';
import type { TerminateContractInput } from '../../../domain/entities/ContractTypes';

class TerminateContractUseCase extends UseCase<TerminateContractInput, any> {
  private readonly repository: ContractRepository;

  public constructor(repository: ContractRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {ValidationError} `resolution` inválido, `terminated` sem `termination_reason`, ou contrato já em estado final (400).
   * @throws {NotFoundError} Contrato não encontrado (404).
   */
  public async execute(input: TerminateContractInput): Promise<any> {
    if (!['terminated', 'expired'].includes(input.resolution)) {
      throw new ValidationError('resolution deve ser terminated ou expired.');
    }
    if (input.resolution === 'terminated' && !input.termination_reason) {
      throw new ValidationError('termination_reason é obrigatório para resolution=terminated.');
    }

    const contract = await this.repository.findById(input.id);
    if (!contract) throw new NotFoundError(`Contrato ${input.id} não encontrado.`);

    if (['expired', 'terminated', 'canceled'].includes(contract.status)) {
      throw new ValidationError('Contrato já está encerrado — não é possível reverter para active via este ou qualquer outro endpoint.');
    }

    return this.repository.update(input.id, {
      status: input.resolution,
      termination_reason: input.resolution === 'terminated' ? input.termination_reason : null,
      termination_date: input.termination_date ?? new Date().toISOString().slice(0, 10),
    });
  }
}

export = TerminateContractUseCase;
