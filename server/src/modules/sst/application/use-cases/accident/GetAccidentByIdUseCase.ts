/**
 * Use case: detalhe de um acidente (inclui CATs, investigação, complementos).
 *
 * @module modules/sst/application/use-cases/accident/GetAccidentByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AccidentRepository from '../../../domain/repositories/AccidentRepository';
import { NotFoundError } from '../../../../../errors';
import { toAccidentDTO } from '../../../infrastructure/mappers/AccidentMapper';

class GetAccidentByIdUseCase extends UseCase<{ id: string | number }, any> {
  private readonly accidentRepository: AccidentRepository;

  public constructor(accidentRepository: AccidentRepository) {
    super();
    this.accidentRepository = accidentRepository;
  }

  /** @throws {NotFoundError} Se não existir. */
  public async execute({ id }: { id: string | number }): Promise<any> {
    const acidente = await this.accidentRepository.findAccidentById(id);
    if (!acidente) throw new NotFoundError('Acidente não encontrado.');
    return toAccidentDTO(acidente);
  }
}

export = GetAccidentByIdUseCase;
