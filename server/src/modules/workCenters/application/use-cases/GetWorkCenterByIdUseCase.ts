/**
 * Caso de uso: busca de um centro de trabalho por id, com turnos incluidos.
 *
 * @module modules/workCenters/application/use-cases/GetWorkCenterByIdUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import WorkCenterRepository from '../../domain/repositories/WorkCenterRepository';

type GetWorkCenterByIdInput = { id: number };

class GetWorkCenterByIdUseCase extends UseCase<GetWorkCenterByIdInput, any> {
  private readonly workCenterRepository: WorkCenterRepository;

  constructor(workCenterRepository: WorkCenterRepository) {
    super();
    this.workCenterRepository = workCenterRepository;
  }

  async execute({ id }: GetWorkCenterByIdInput) {
    const workCenter = await this.workCenterRepository.findWorkCenterById(id);
    if (!workCenter) {
      throw new NotFoundError('Centro de trabalho nao encontrado.');
    }
    return workCenter;
  }
}

export = GetWorkCenterByIdUseCase;
