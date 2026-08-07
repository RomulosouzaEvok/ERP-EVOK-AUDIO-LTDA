/**
 * Use case: encerrar um acidente (RF-SST-026/BR-SST-018).
 *
 * Bloqueado se `gravidade` ∈ {`com_afastamento`, `incapacidade_permanente`,
 * `obito`} e não existir `InvestigacaoAcidente` com pelo menos 1
 * `AcaoCorretiva` vinculada (E2/UC-46).
 *
 * NOTA DE SCHEMA (transparência para o próximo bloco): `sst_acidentes` não
 * tem uma coluna de status de encerramento dedicada (apenas `confirmado`,
 * que já é `true` desde a criação — ver `CreateAccidentUseCase`). Este use
 * case portanto funciona como PORTÃO DE VALIDAÇÃO (RF-SST-026) sem
 * persistir uma transição de estado nova; se o produto precisar de um
 * "encerrado_em"/status de fechamento auditável, é necessária uma migration
 * adicional (fora do escopo desta passada — migrations já estão travadas
 * aguardando aprovação do dono do produto).
 *
 * @module modules/sst/application/use-cases/accident/CloseAccidentUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AccidentRepository from '../../../domain/repositories/AccidentRepository';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import { toAccidentDTO } from '../../../infrastructure/mappers/AccidentMapper';

const GRAVE = ['com_afastamento', 'incapacidade_permanente', 'obito'];

class CloseAccidentUseCase extends UseCase<{ id: string | number }, any> {
  private readonly accidentRepository: AccidentRepository;

  public constructor(accidentRepository: AccidentRepository) {
    super();
    this.accidentRepository = accidentRepository;
  }

  /**
   * @throws {NotFoundError} Se o acidente não existir (404).
   * @throws {BusinessRuleError} Se gravidade exigir investigação+ação corretiva e ela não existir (422).
   */
  public async execute({ id }: { id: string | number }): Promise<any> {
    const acidente = await this.accidentRepository.findAccidentById(id);
    if (!acidente) throw new NotFoundError('Acidente não encontrado.');

    if (GRAVE.includes(acidente.gravidade)) {
      const investigacao = await this.accidentRepository.findInvestigationByAccidentId(acidente.id);
      const acoesCount = investigacao
        ? await this.accidentRepository.countCorrectiveActionsByOrigin('investigacao_acidente', investigacao.id)
        : 0;
      if (!investigacao || acoesCount === 0) {
        throw new BusinessRuleError(
          'Acidente com afastamento (ou mais grave) exige investigação e ao menos uma ação corretiva antes do encerramento.',
          { code: 'INVESTIGATION_REQUIRED' }
        );
      }
    }

    const closed = await this.accidentRepository.closeAccident(acidente.id);
    return toAccidentDTO(closed ?? acidente);
  }
}

export = CloseAccidentUseCase;
