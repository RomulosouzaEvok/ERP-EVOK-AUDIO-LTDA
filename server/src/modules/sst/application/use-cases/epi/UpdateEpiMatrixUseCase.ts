/**
 * Use case: atualizar quantidade/observação de um vínculo da MatrizEPI.
 *
 * @module modules/sst/application/use-cases/epi/UpdateEpiMatrixUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import EpiRepository from '../../../domain/repositories/EpiRepository';
import { NotFoundError } from '../../../../../errors';
import { fromMatrizInput, toMatrizDTO } from '../../../infrastructure/mappers/EpiMapper';

class UpdateEpiMatrixUseCase extends UseCase<{ id: string | number; body: Record<string, any> }, any> {
  private readonly epiRepository: EpiRepository;

  public constructor(epiRepository: EpiRepository) {
    super();
    this.epiRepository = epiRepository;
  }

  /**
   * @param input - `{ id, body }`.
   * @returns Vínculo atualizado.
   * @throws {NotFoundError} Se não existir.
   */
  public async execute({ id, body }: { id: string | number; body: Record<string, any> }): Promise<any> {
    const matriz = await this.epiRepository.updateMatriz(id, fromMatrizInput(body));
    if (!matriz) throw new NotFoundError('Vínculo de matriz de EPI não encontrado.');
    return toMatrizDTO(matriz);
  }
}

export = UpdateEpiMatrixUseCase;
