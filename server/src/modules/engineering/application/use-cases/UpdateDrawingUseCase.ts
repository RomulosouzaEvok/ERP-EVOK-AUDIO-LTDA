/**
 * Caso de uso: atualizacao de um desenho tecnico existente.
 *
 * Se `drawing_number` e/ou `revision` forem informados, revalida a
 * unicidade da combinacao (ignorando o proprio registro).
 *
 * @module modules/engineering/application/use-cases/UpdateDrawingUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ConflictError, NotFoundError } from '../../../../errors';
import EngineeringRepository from '../../domain/repositories/EngineeringRepository';

type UpdateDrawingInput = {
  id: number;
  drawing_number?: string;
  revision?: string;
  title?: string;
  drawing_type?: 'assembly' | 'detail' | 'exploded' | 'schematic' | 'bom';
  file_path?: string | null;
  material_spec?: string | null;
  dimensions?: string | null;
  tolerances?: string | null;
  notes?: string | null;
};

class UpdateDrawingUseCase extends UseCase<UpdateDrawingInput, any> {
  private readonly engineeringRepository: EngineeringRepository;

  constructor(engineeringRepository: EngineeringRepository) {
    super();
    this.engineeringRepository = engineeringRepository;
  }

  async execute(input: UpdateDrawingInput): Promise<any> {
    const { id, ...rest } = input;

    const current = await this.engineeringRepository.findDrawingById(id);
    if (!current) {
      throw new NotFoundError('Desenho tecnico nao encontrado.');
    }

    const nextNumber = rest.drawing_number ?? current.drawing_number;
    const nextRevision = rest.revision ?? current.revision;

    if (rest.drawing_number !== undefined || rest.revision !== undefined) {
      const existing = await this.engineeringRepository.findDrawingByNumberAndRevision(nextNumber, nextRevision);
      if (existing && existing.id !== id) {
        throw new ConflictError(
          `Ja existe um desenho tecnico ${nextNumber} na revisao ${nextRevision}.`
        );
      }
    }

    return this.engineeringRepository.updateDrawing(id, rest);
  }
}

export = UpdateDrawingUseCase;
