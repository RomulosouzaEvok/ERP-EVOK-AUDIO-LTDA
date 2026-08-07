/**
 * Use case: registrar um ExameComplementar vinculado a um ASO (RF-SST-013).
 *
 * @module modules/sst/application/use-cases/aso/CreateComplementaryExamUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AsoRepository from '../../../domain/repositories/AsoRepository';
import { ValidationError, NotFoundError } from '../../../../../errors';

interface CreateComplementaryExamInput {
  asoId: string | number;
  body: { tipo?: string; data?: string; resultado_url?: string; alterado?: boolean };
}

class CreateComplementaryExamUseCase extends UseCase<CreateComplementaryExamInput, any> {
  private readonly asoRepository: AsoRepository;

  public constructor(asoRepository: AsoRepository) {
    super();
    this.asoRepository = asoRepository;
  }

  /**
   * @throws {ValidationError} Se `tipo`/`data` ausentes (400).
   * @throws {NotFoundError} Se o ASO não existir (404).
   */
  public async execute({ asoId, body }: CreateComplementaryExamInput): Promise<any> {
    if (!body.tipo || !body.data) {
      throw new ValidationError('tipo e data são obrigatórios.');
    }
    const aso = await this.asoRepository.findAsoById(asoId);
    if (!aso) throw new NotFoundError('ASO não encontrado.');

    const exame = await this.asoRepository.createComplementaryExam({
      aso_id: aso.id,
      tipo_exame: body.tipo,
      data_realizacao: body.data,
      resultado_laudo_url: body.resultado_url ?? null,
      alterado: body.alterado ?? false
    });

    return { id: exame.id, aso_id: exame.aso_id, tipo: exame.tipo_exame, data: exame.data_realizacao, resultado_url: exame.resultado_laudo_url, alterado: exame.alterado };
  }
}

export = CreateComplementaryExamUseCase;
