/**
 * Use case: cadastrar brigadista (RF-SST-052).
 *
 * @module modules/sst/application/use-cases/safetyRoutine/CreateBrigadeMemberUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import SafetyRoutineRepository from '../../../domain/repositories/SafetyRoutineRepository';
import { ValidationError } from '../../../../../errors';
import { toBrigadeMemberDTO } from '../../../infrastructure/mappers/SafetyRoutineMapper';

interface CreateBrigadeMemberInput {
  body: { employee_id: number; data_formacao: string; validade_reciclagem?: string };
}

class CreateBrigadeMemberUseCase extends UseCase<CreateBrigadeMemberInput, any> {
  private readonly repository: SafetyRoutineRepository;

  public constructor(repository: SafetyRoutineRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {ValidationError} `employee_id`/`data_formacao` ausentes (400). */
  public async execute({ body }: CreateBrigadeMemberInput): Promise<any> {
    if (!body.employee_id || !body.data_formacao) throw new ValidationError('employee_id e data_formacao são obrigatórios.');
    const brigadista = await this.repository.createBrigadeMember({
      employee_id: body.employee_id,
      data_formacao: body.data_formacao,
      validade_reciclagem: body.validade_reciclagem ?? null,
      ativo: true
    });
    return toBrigadeMemberDTO(brigadista);
  }
}

export = CreateBrigadeMemberUseCase;
