/**
 * Use case: detalhe de uma EntregaEPI.
 *
 * @module modules/sst/application/use-cases/epi/GetEpiDeliveryByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import EpiRepository from '../../../domain/repositories/EpiRepository';
import { NotFoundError } from '../../../../../errors';
import { toEntregaDTO } from '../../../infrastructure/mappers/EpiMapper';

class GetEpiDeliveryByIdUseCase extends UseCase<{ id: string | number }, any> {
  private readonly epiRepository: EpiRepository;

  public constructor(epiRepository: EpiRepository) {
    super();
    this.epiRepository = epiRepository;
  }

  /**
   * @param input - `{ id }`.
   * @throws {NotFoundError} Se não existir.
   */
  public async execute({ id }: { id: string | number }): Promise<any> {
    const entrega = await this.epiRepository.findEntregaById(id);
    if (!entrega) throw new NotFoundError('Entrega de EPI não encontrada.');
    return toEntregaDTO(entrega);
  }
}

export = GetEpiDeliveryByIdUseCase;
