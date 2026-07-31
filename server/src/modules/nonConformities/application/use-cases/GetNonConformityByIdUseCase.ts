/**
 * Use case: buscar não conformidade por id.
 *
 * @module modules/nonConformities/application/use-cases/GetNonConformityByIdUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import NonConformitiesRepository from '../../domain/repositories/NonConformitiesRepository';

class GetNonConformityByIdUseCase extends UseCase<{ id: number | string }, any> {
  private readonly nonConformitiesRepository: NonConformitiesRepository;

  /** @param nonConformitiesRepository - Repositorio de não conformidades. */
  public constructor(nonConformitiesRepository: NonConformitiesRepository) {
    super();
    this.nonConformitiesRepository = nonConformitiesRepository;
  }

  /**
   * @param input - Id da não conformidade.
   * @returns Não conformidade encontrada.
   * @throws {NotFoundError} Se o registro não existir.
   */
  public async execute({ id }: { id: number | string }): Promise<any> {
    const nonConformity = await this.nonConformitiesRepository.findById(id);
    if (!nonConformity) {
      throw new NotFoundError('Não conformidade não encontrada');
    }
    return nonConformity;
  }
}

export = GetNonConformityByIdUseCase;
