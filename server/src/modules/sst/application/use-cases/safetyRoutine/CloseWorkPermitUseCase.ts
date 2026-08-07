/**
 * Use case: encerrar manualmente uma Permissão de Trabalho (a expiração
 * automática pelo `fim_validade` é um job, não uma rota).
 *
 * @module modules/sst/application/use-cases/safetyRoutine/CloseWorkPermitUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import SafetyRoutineRepository from '../../../domain/repositories/SafetyRoutineRepository';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import { toWorkPermitDTO } from '../../../infrastructure/mappers/SafetyRoutineMapper';

interface CloseWorkPermitInput {
  id: string | number;
}

class CloseWorkPermitUseCase extends UseCase<CloseWorkPermitInput, any> {
  private readonly repository: SafetyRoutineRepository;

  public constructor(repository: SafetyRoutineRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} PT não encontrada (404).
   * @throws {BusinessRuleError} PT já encerrada/cancelada (422).
   */
  public async execute({ id }: CloseWorkPermitInput): Promise<any> {
    const pt = await this.repository.findWorkPermitById(id);
    if (!pt) throw new NotFoundError('Permissão de Trabalho não encontrada.');
    if (pt.status !== 'emitida') throw new BusinessRuleError('Esta Permissão de Trabalho já está encerrada ou cancelada.');

    const atualizada = await this.repository.updateWorkPermitStatus(id, 'encerrada');
    return toWorkPermitDTO(atualizada);
  }
}

export = CloseWorkPermitUseCase;
