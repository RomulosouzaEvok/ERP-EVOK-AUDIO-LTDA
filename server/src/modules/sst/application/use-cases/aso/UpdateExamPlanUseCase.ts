/**
 * Use case: atualizar periodicidade/risco exigido de um PlanoExames.
 *
 * @module modules/sst/application/use-cases/aso/UpdateExamPlanUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AsoRepository from '../../../domain/repositories/AsoRepository';
import { NotFoundError } from '../../../../../errors';
import { fromExamPlanInput, toExamPlanDTO } from '../../../infrastructure/mappers/AsoMapper';

class UpdateExamPlanUseCase extends UseCase<{ id: string | number; body: Record<string, any> }, any> {
  private readonly asoRepository: AsoRepository;

  public constructor(asoRepository: AsoRepository) {
    super();
    this.asoRepository = asoRepository;
  }

  /** @throws {NotFoundError} Se não existir. */
  public async execute({ id, body }: { id: string | number; body: Record<string, any> }): Promise<any> {
    const plano = await this.asoRepository.updateExamPlan(id, fromExamPlanInput(body));
    if (!plano) throw new NotFoundError('Plano de exames não encontrado.');
    return toExamPlanDTO(plano);
  }
}

export = UpdateExamPlanUseCase;
