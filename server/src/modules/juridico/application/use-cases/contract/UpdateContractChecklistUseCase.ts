/**
 * `POST /api/jur/contracts/:id/checklist` — responde item do checklist de
 * cláusulas (PI/confidencialidade/não concorrência — RF-JUR-010),
 * obrigatório para `employment`/`supplier`/`nda` antes da ativação.
 *
 * @module modules/juridico/application/use-cases/contract/UpdateContractChecklistUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ContractRepository from '../../../domain/repositories/ContractRepository';
import { ValidationError, NotFoundError } from '../../../../../errors';
import type { UpdateContractChecklistInput } from '../../../domain/entities/ContractTypes';

const VALID_VALUES = ['yes', 'no', 'not_applicable'];

class UpdateContractChecklistUseCase extends UseCase<UpdateContractChecklistInput, any> {
  private readonly repository: ContractRepository;

  public constructor(repository: ContractRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {ValidationError} `checklist` ausente/inválido (400).
   * @throws {NotFoundError} Contrato não encontrado (404).
   */
  public async execute(input: UpdateContractChecklistInput): Promise<any> {
    if (!input.checklist || typeof input.checklist !== 'object') {
      throw new ValidationError('checklist é obrigatório (objeto pi/confidentiality/non_compete).');
    }
    const invalidValue = Object.values(input.checklist).some((value) => !VALID_VALUES.includes(value));
    if (invalidValue) {
      throw new ValidationError(`Cada item do checklist deve ser um de: ${VALID_VALUES.join(', ')}.`);
    }

    const contract = await this.repository.findById(input.contractId);
    if (!contract) throw new NotFoundError(`Contrato ${input.contractId} não encontrado.`);

    const merged = { ...(contract.clause_checklist ?? {}), ...input.checklist };
    return this.repository.update(input.contractId, { clause_checklist: merged });
  }
}

export = UpdateContractChecklistUseCase;
