/**
 * Caso de uso: criacao de um desenho tecnico de produto.
 *
 * A combinacao `drawing_number` + `revision` deve ser unica (regra de
 * negocio de controle de revisao de engenharia).
 *
 * @module modules/engineering/application/use-cases/CreateDrawingUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ConflictError } from '../../../../errors';
import EngineeringRepository from '../../domain/repositories/EngineeringRepository';

type CreateDrawingInput = {
  product_id: number;
  drawing_number: string;
  revision?: string;
  title: string;
  drawing_type?: 'assembly' | 'detail' | 'exploded' | 'schematic' | 'bom';
  file_path?: string | null;
  material_spec?: string | null;
  dimensions?: string | null;
  tolerances?: string | null;
  notes?: string | null;
};

class CreateDrawingUseCase extends UseCase<CreateDrawingInput, any> {
  private readonly engineeringRepository: EngineeringRepository;

  constructor(engineeringRepository: EngineeringRepository) {
    super();
    this.engineeringRepository = engineeringRepository;
  }

  async execute(input: CreateDrawingInput): Promise<any> {
    const revision = input.revision ?? '00';

    const existing = await this.engineeringRepository.findDrawingByNumberAndRevision(
      input.drawing_number,
      revision
    );
    if (existing) {
      throw new ConflictError(
        `Ja existe um desenho tecnico ${input.drawing_number} na revisao ${revision}.`
      );
    }

    return this.engineeringRepository.createDrawing({
      product_id: input.product_id,
      drawing_number: input.drawing_number,
      revision,
      title: input.title,
      drawing_type: input.drawing_type ?? 'detail',
      file_path: input.file_path ?? null,
      material_spec: input.material_spec ?? null,
      dimensions: input.dimensions ?? null,
      tolerances: input.tolerances ?? null,
      notes: input.notes ?? null,
      status: 'draft',
    });
  }
}

export = CreateDrawingUseCase;
