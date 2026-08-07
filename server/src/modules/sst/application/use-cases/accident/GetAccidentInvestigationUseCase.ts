/**
 * Use case: detalhe da investigação de um acidente.
 *
 * @module modules/sst/application/use-cases/accident/GetAccidentInvestigationUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AccidentRepository from '../../../domain/repositories/AccidentRepository';
import { NotFoundError } from '../../../../../errors';

class GetAccidentInvestigationUseCase extends UseCase<{ accidentId: string | number }, any> {
  private readonly accidentRepository: AccidentRepository;

  public constructor(accidentRepository: AccidentRepository) {
    super();
    this.accidentRepository = accidentRepository;
  }

  /** @throws {NotFoundError} Se o acidente ou a investigação não existirem (404). */
  public async execute({ accidentId }: { accidentId: string | number }): Promise<any> {
    const acidente = await this.accidentRepository.findAccidentById(accidentId);
    if (!acidente) throw new NotFoundError('Acidente não encontrado.');
    const investigacao = await this.accidentRepository.findInvestigationByAccidentId(acidente.id);
    if (!investigacao) throw new NotFoundError('Este acidente não possui investigação registrada.');
    const acoes = await this.accidentRepository.countCorrectiveActionsByOrigin('investigacao_acidente', investigacao.id);
    return {
      id: investigacao.id,
      acidente_id: investigacao.acidente_id,
      causas_identificadas: investigacao.causas_identificadas,
      participantes: investigacao.participantes,
      evidencias_urls: investigacao.evidencias_urls,
      concluida_em: investigacao.concluida_em,
      acoes_corretivas_count: acoes
    };
  }
}

export = GetAccidentInvestigationUseCase;
