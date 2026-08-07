/**
 * Use case: inscrever candidato num processo eleitoral da CIPA
 * (RF-SST-029, BR-SST-021, UC-48).
 *
 * FLUXO DE EXCEÇÃO (decisão de design tomada nesta passada, não reabertura
 * de escopo fechado): além do bloqueio por 2 mandatos consecutivos eleitos
 * (BR-SST-021, já documentado em `BLOCO_1_SST_API.md` §5), esta
 * implementação também rejeita inscrição em processo eleitoral já
 * ENCERRADO (`total_votantes` preenchido por `CloseElectoralProcessUseCase`)
 * — o contrato de API não detalha esse caso explicitamente, mas é
 * consequência direta de "eleger membro fora do processo eleitoral aberto"
 * seria uma inconsistência de dado grave (voto/candidatura pós-apuração).
 *
 * @module modules/sst/application/use-cases/cipa/AddCandidateUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import CipaRepository from '../../../domain/repositories/CipaRepository';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../../errors';
import { toCandidateDTO } from '../../../infrastructure/mappers/CipaMapper';

const MAX_MANDATOS_CONSECUTIVOS_ELEITO = 2;

interface AddCandidateInput {
  processId: string | number;
  body: Record<string, any>;
}

class AddCandidateUseCase extends UseCase<AddCandidateInput, any> {
  private readonly cipaRepository: CipaRepository;

  public constructor(cipaRepository: CipaRepository) {
    super();
    this.cipaRepository = cipaRepository;
  }

  /**
   * @throws {ValidationError} `employee_id` ausente (400).
   * @throws {NotFoundError} Processo eleitoral não encontrado (404).
   * @throws {BusinessRuleError} Processo já encerrado (422) ou candidato com 2 mandatos consecutivos eleitos (422/BR-SST-021).
   */
  public async execute({ processId, body }: AddCandidateInput): Promise<any> {
    if (!body.employee_id) throw new ValidationError('employee_id é obrigatório.');

    const processo = await this.cipaRepository.findElectoralProcessById(processId);
    if (!processo) throw new NotFoundError('Processo eleitoral não encontrado.');
    if (processo.total_votantes != null) {
      throw new BusinessRuleError('Não é possível inscrever candidato: o processo eleitoral já foi encerrado (apurado).');
    }

    const consecutivos = await this.cipaRepository.countConsecutiveElectedTerms(body.employee_id);
    if (consecutivos >= MAX_MANDATOS_CONSECUTIVOS_ELEITO) {
      throw new BusinessRuleError('Funcionário já cumpriu 2 mandatos consecutivos como eleito (BR-SST-021).');
    }

    const candidato = await this.cipaRepository.createCandidate({
      processo_eleitoral_id: processo.id,
      employee_id: body.employee_id
    });
    return toCandidateDTO(candidato);
  }
}

export = AddCandidateUseCase;
