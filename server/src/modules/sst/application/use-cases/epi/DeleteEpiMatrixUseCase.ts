/**
 * Use case: remover um vínculo da MatrizEPI (regra viva, sem valor
 * probatório histórico — diferente de EntregaEPI).
 *
 * @module modules/sst/application/use-cases/epi/DeleteEpiMatrixUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import EpiRepository from '../../../domain/repositories/EpiRepository';
import { NotFoundError } from '../../../../../errors';

class DeleteEpiMatrixUseCase extends UseCase<{ id: string | number }, { deleted: true }> {
  private readonly epiRepository: EpiRepository;

  public constructor(epiRepository: EpiRepository) {
    super();
    this.epiRepository = epiRepository;
  }

  /**
   * @param input - `{ id }`.
   * @throws {NotFoundError} Se não existir.
   */
  public async execute({ id }: { id: string | number }): Promise<{ deleted: true }> {
    const deleted = await this.epiRepository.deleteMatriz(id);
    if (!deleted) throw new NotFoundError('Vínculo de matriz de EPI não encontrado.');
    return { deleted: true };
  }
}

export = DeleteEpiMatrixUseCase;
