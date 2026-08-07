/**
 * Use case: atualizar item do inventário de riscos ocupacionais (nova
 * medição, medidas de controle, `data_revisao`) — RF-SST-037/038.
 *
 * @module modules/sst/application/use-cases/pgr/UpdateRiskUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import PgrRepository from '../../../domain/repositories/PgrRepository';
import { NotFoundError } from '../../../../../errors';
import { fromRiskInput, toRiskDTO } from '../../../infrastructure/mappers/PgrMapper';

interface UpdateRiskInput {
  id: string | number;
  body: Record<string, any>;
}

class UpdateRiskUseCase extends UseCase<UpdateRiskInput, any> {
  private readonly pgrRepository: PgrRepository;

  public constructor(pgrRepository: PgrRepository) {
    super();
    this.pgrRepository = pgrRepository;
  }

  /** @throws {NotFoundError} Risco não encontrado (404). */
  public async execute({ id, body }: UpdateRiskInput): Promise<any> {
    const existente = await this.pgrRepository.findRiskById(id);
    if (!existente) throw new NotFoundError('Risco ocupacional não encontrado.');
    const atualizado = await this.pgrRepository.updateRisk(id, fromRiskInput(body));
    return toRiskDTO(atualizado);
  }
}

export = UpdateRiskUseCase;
