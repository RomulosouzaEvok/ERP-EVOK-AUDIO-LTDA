/**
 * Caso de uso: obsolescencia de um desenho tecnico.
 *
 * Transicao valida apenas `released` -> `obsolete`.
 *
 * @module modules/engineering/application/use-cases/ObsoleteDrawingUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { BusinessRuleError, NotFoundError } from '../../../../errors';
import EngineeringRepository from '../../domain/repositories/EngineeringRepository';

type ObsoleteDrawingInput = { id: number };

class ObsoleteDrawingUseCase extends UseCase<ObsoleteDrawingInput, any> {
  private readonly engineeringRepository: EngineeringRepository;

  constructor(engineeringRepository: EngineeringRepository) {
    super();
    this.engineeringRepository = engineeringRepository;
  }

  async execute({ id }: ObsoleteDrawingInput): Promise<any> {
    const drawing = await this.engineeringRepository.findDrawingById(id);
    if (!drawing) {
      throw new NotFoundError('Desenho tecnico nao encontrado.');
    }

    if (drawing.status !== 'released') {
      throw new BusinessRuleError(
        `Desenho tecnico so pode ser tornado obsoleto a partir do status 'released' (status atual: '${drawing.status}').`
      );
    }

    return this.engineeringRepository.updateDrawing(id, { status: 'obsolete' });
  }
}

export = ObsoleteDrawingUseCase;
