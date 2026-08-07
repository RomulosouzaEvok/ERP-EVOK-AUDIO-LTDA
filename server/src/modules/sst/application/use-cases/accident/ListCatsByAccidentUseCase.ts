/**
 * Use case: listar as CATs de um acidente (inicial + reaberturas).
 *
 * @module modules/sst/application/use-cases/accident/ListCatsByAccidentUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AccidentRepository from '../../../domain/repositories/AccidentRepository';
import { NotFoundError } from '../../../../../errors';
import { toCatDTO } from '../../../infrastructure/mappers/AccidentMapper';

class ListCatsByAccidentUseCase extends UseCase<{ accidentId: string | number }, any[]> {
  private readonly accidentRepository: AccidentRepository;

  public constructor(accidentRepository: AccidentRepository) {
    super();
    this.accidentRepository = accidentRepository;
  }

  /** @throws {NotFoundError} Se o acidente não existir (404). */
  public async execute({ accidentId }: { accidentId: string | number }): Promise<any[]> {
    const acidente = await this.accidentRepository.findAccidentById(accidentId);
    if (!acidente) throw new NotFoundError('Acidente não encontrado.');
    const cats = await this.accidentRepository.findCatsByAccidentId(acidente.id);
    return cats.map(toCatDTO);
  }
}

export = ListCatsByAccidentUseCase;
