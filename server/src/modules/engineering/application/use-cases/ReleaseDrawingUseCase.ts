/**
 * Caso de uso: liberacao (release) de um desenho tecnico.
 *
 * Transicao valida apenas `draft` -> `released`. Define `approved_by` (id do
 * usuario autenticado) e `approval_date` (hoje).
 *
 * @module modules/engineering/application/use-cases/ReleaseDrawingUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { BusinessRuleError, NotFoundError } from '../../../../errors';
import EngineeringRepository from '../../domain/repositories/EngineeringRepository';

type ReleaseDrawingInput = {
  id: number;
  approvedBy: number;
};

class ReleaseDrawingUseCase extends UseCase<ReleaseDrawingInput, any> {
  private readonly engineeringRepository: EngineeringRepository;

  constructor(engineeringRepository: EngineeringRepository) {
    super();
    this.engineeringRepository = engineeringRepository;
  }

  async execute({ id, approvedBy }: ReleaseDrawingInput): Promise<any> {
    const drawing = await this.engineeringRepository.findDrawingById(id);
    if (!drawing) {
      throw new NotFoundError('Desenho tecnico nao encontrado.');
    }

    if (drawing.status !== 'draft') {
      throw new BusinessRuleError(
        `Desenho tecnico so pode ser liberado a partir do status 'draft' (status atual: '${drawing.status}').`
      );
    }

    const today = new Date().toISOString().slice(0, 10);

    return this.engineeringRepository.updateDrawing(id, {
      status: 'released',
      approved_by: approvedBy,
      approval_date: today,
    });
  }
}

export = ReleaseDrawingUseCase;
