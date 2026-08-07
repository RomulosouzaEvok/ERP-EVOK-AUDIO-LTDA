/**
 * Use case: detalhe de um TipoEPI.
 *
 * @module modules/sst/application/use-cases/epi/GetEpiTypeByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import EpiRepository from '../../../domain/repositories/EpiRepository';
import { NotFoundError } from '../../../../../errors';
import { toTipoEpiDTO } from '../../../infrastructure/mappers/EpiMapper';

class GetEpiTypeByIdUseCase extends UseCase<{ id: string | number }, any> {
  private readonly epiRepository: EpiRepository;

  public constructor(epiRepository: EpiRepository) {
    super();
    this.epiRepository = epiRepository;
  }

  /**
   * @param input - `{ id }` do TipoEPI.
   * @returns DTO do TipoEPI.
   * @throws {NotFoundError} Se não existir.
   */
  public async execute({ id }: { id: string | number }): Promise<any> {
    const tipo = await this.epiRepository.findTipoById(id);
    if (!tipo) throw new NotFoundError('Tipo de EPI não encontrado.');
    return toTipoEpiDTO(tipo);
  }
}

export = GetEpiTypeByIdUseCase;
