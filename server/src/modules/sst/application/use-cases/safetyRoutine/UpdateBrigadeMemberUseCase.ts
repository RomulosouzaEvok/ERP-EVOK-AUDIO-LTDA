/**
 * Use case: atualizar validade de reciclagem / `active` de um brigadista.
 *
 * @module modules/sst/application/use-cases/safetyRoutine/UpdateBrigadeMemberUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import SafetyRoutineRepository from '../../../domain/repositories/SafetyRoutineRepository';
import { NotFoundError } from '../../../../../errors';
import { toBrigadeMemberDTO } from '../../../infrastructure/mappers/SafetyRoutineMapper';

interface UpdateBrigadeMemberInput {
  id: string | number;
  body: { validade_reciclagem?: string; active?: boolean };
}

class UpdateBrigadeMemberUseCase extends UseCase<UpdateBrigadeMemberInput, any> {
  private readonly repository: SafetyRoutineRepository;

  public constructor(repository: SafetyRoutineRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Brigadista não encontrado (404). */
  public async execute({ id, body }: UpdateBrigadeMemberInput): Promise<any> {
    const existente = await this.repository.findBrigadeMemberById(id);
    if (!existente) throw new NotFoundError('Brigadista não encontrado.');

    const data: Record<string, unknown> = {};
    if (body.validade_reciclagem !== undefined) data.validade_reciclagem = body.validade_reciclagem;
    if (body.active !== undefined) data.ativo = body.active;

    const atualizado = await this.repository.updateBrigadeMember(id, data);
    return toBrigadeMemberDTO(atualizado);
  }
}

export = UpdateBrigadeMemberUseCase;
