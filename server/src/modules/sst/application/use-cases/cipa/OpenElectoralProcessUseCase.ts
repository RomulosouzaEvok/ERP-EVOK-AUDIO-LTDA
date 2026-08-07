/**
 * Use case: abrir processo eleitoral (edital) para o próximo mandato da
 * CIPA (RF-SST-029, UC-48).
 *
 * @module modules/sst/application/use-cases/cipa/OpenElectoralProcessUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import CipaRepository from '../../../domain/repositories/CipaRepository';
import { NotFoundError, ValidationError } from '../../../../../errors';
import { fromElectoralProcessInput, toElectoralProcessDTO } from '../../../infrastructure/mappers/CipaMapper';

interface OpenElectoralProcessInput {
  body: Record<string, any>;
}

class OpenElectoralProcessUseCase extends UseCase<OpenElectoralProcessInput, any> {
  private readonly cipaRepository: CipaRepository;

  public constructor(cipaRepository: CipaRepository) {
    super();
    this.cipaRepository = cipaRepository;
  }

  /**
   * @throws {ValidationError} `mandato_id` ausente (400).
   * @throws {NotFoundError} Mandato não encontrado (404).
   */
  public async execute({ body }: OpenElectoralProcessInput): Promise<any> {
    if (!body.mandato_id) throw new ValidationError('mandato_id é obrigatório.');
    const mandato = await this.cipaRepository.findMandateById(body.mandato_id);
    if (!mandato) throw new NotFoundError('Mandato de CIPA não encontrado.');

    const processo = await this.cipaRepository.createElectoralProcess(fromElectoralProcessInput(body));
    return toElectoralProcessDTO(processo);
  }
}

export = OpenElectoralProcessUseCase;
