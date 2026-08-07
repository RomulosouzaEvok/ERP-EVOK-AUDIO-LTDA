/**
 * Use case: criar item do PlanoExames (função/GES × tipo de exame × periodicidade).
 *
 * @module modules/sst/application/use-cases/aso/CreateExamPlanUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AsoRepository from '../../../domain/repositories/AsoRepository';
import { ValidationError } from '../../../../../errors';
import { fromExamPlanInput, toExamPlanDTO } from '../../../infrastructure/mappers/AsoMapper';

class CreateExamPlanUseCase extends UseCase<{ body: Record<string, any> }, any> {
  private readonly asoRepository: AsoRepository;

  public constructor(asoRepository: AsoRepository) {
    super();
    this.asoRepository = asoRepository;
  }

  /**
   * @param input - `{ body }`.
   * @throws {ValidationError} Se `position`/`ges_id` ausentes, `tipo_exame` ausente ou `periodicidade_meses` inválida (400).
   */
  public async execute({ body }: { body: Record<string, any> }): Promise<any> {
    if (!body.position && !body.ges_id) {
      throw new ValidationError('Informe ao menos um de position ou ges_id.');
    }
    if (!body.tipo_exame || !body.periodicidade_meses || Number(body.periodicidade_meses) <= 0) {
      throw new ValidationError('tipo_exame e periodicidade_meses (> 0) são obrigatórios.');
    }
    const plano = await this.asoRepository.createExamPlan(fromExamPlanInput(body));
    return toExamPlanDTO(plano);
  }
}

export = CreateExamPlanUseCase;
