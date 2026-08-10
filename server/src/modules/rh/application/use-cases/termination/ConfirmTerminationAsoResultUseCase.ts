/**
 * `PATCH /api/rh/termination-processes/:id/aso-confirmation` — RF-RH-020/030.
 *
 * ⚠️ Mesmo gap de contrato já documentado em
 * `ConfirmAdmissionAsoResultUseCase` — endpoint ADICIONADO nesta
 * implementação (não estava em `docs/business/BLOCO_6_RH_API.md` §6), pois
 * sem ele o gate de `ConcludeTerminationProcessUseCase` nunca poderia ser
 * satisfeito.
 *
 * @module modules/rh/application/use-cases/termination/ConfirmTerminationAsoResultUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../../errors';
import TerminationProcessRepository from '../../../domain/repositories/TerminationProcessRepository';

const VALID_RESULTS = ['apto', 'inapto', 'apto_com_restricao'];

class ConfirmTerminationAsoResultUseCase extends UseCase<{ id: number | string; aso_result: string }, any> {
  private readonly repository: TerminationProcessRepository;

  public constructor(repository: TerminationProcessRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ id, aso_result }: { id: number | string; aso_result: string }): Promise<any> {
    if (!VALID_RESULTS.includes(aso_result)) {
      throw new ValidationError(`aso_result deve ser um de: ${VALID_RESULTS.join(', ')}.`);
    }
    const process = await this.repository.findById(id);
    if (!process) throw new NotFoundError('Processo de demissão não encontrado.');
    if (['concluido', 'cancelado'].includes(process.status)) {
      throw new BusinessRuleError('Processo de demissão já está concluído/cancelado.');
    }
    return this.repository.update(id, { aso_result, aso_confirmed_at: new Date() });
  }
}

export = ConfirmTerminationAsoResultUseCase;
