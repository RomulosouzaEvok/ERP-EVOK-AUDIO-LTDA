/**
 * Use case: detalhe de um mandato da CIPA com seus membros.
 *
 * @module modules/sst/application/use-cases/cipa/GetMandateByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import CipaRepository from '../../../domain/repositories/CipaRepository';
import { NotFoundError } from '../../../../../errors';
import { toMandateDTO } from '../../../infrastructure/mappers/CipaMapper';

class GetMandateByIdUseCase extends UseCase<{ id: string | number }, any> {
  private readonly cipaRepository: CipaRepository;

  public constructor(cipaRepository: CipaRepository) {
    super();
    this.cipaRepository = cipaRepository;
  }

  /** @throws {NotFoundError} Se o mandato não existir (404). */
  public async execute({ id }: { id: string | number }): Promise<any> {
    const mandato = await this.cipaRepository.findMandateById(id);
    if (!mandato) throw new NotFoundError('Mandato de CIPA não encontrado.');
    return toMandateDTO(mandato);
  }
}

export = GetMandateByIdUseCase;
