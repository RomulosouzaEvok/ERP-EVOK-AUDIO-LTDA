/**
 * Use case: atualizar um TipoEPI (inclusive inativar — não há DELETE, é
 * catálogo histórico referenciado por EntregaEPI).
 *
 * @module modules/sst/application/use-cases/epi/UpdateEpiTypeUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import EpiRepository from '../../../domain/repositories/EpiRepository';
import { NotFoundError } from '../../../../../errors';
import { fromTipoEpiInput, toTipoEpiDTO } from '../../../infrastructure/mappers/EpiMapper';

class UpdateEpiTypeUseCase extends UseCase<{ id: string | number; body: Record<string, any> }, any> {
  private readonly epiRepository: EpiRepository;

  public constructor(epiRepository: EpiRepository) {
    super();
    this.epiRepository = epiRepository;
  }

  /**
   * @param input - `{ id, body }`.
   * @returns TipoEPI atualizado.
   * @throws {NotFoundError} Se não existir.
   */
  public async execute({ id, body }: { id: string | number; body: Record<string, any> }): Promise<any> {
    const data = fromTipoEpiInput(body);
    const tipo = await this.epiRepository.updateTipo(id, data);
    if (!tipo) throw new NotFoundError('Tipo de EPI não encontrado.');
    return toTipoEpiDTO(tipo);
  }
}

export = UpdateEpiTypeUseCase;
