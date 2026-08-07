/**
 * Use case: registrar a apuração (votos, eleitos, suplentes, atas) de um
 * processo eleitoral da CIPA (RF-SST-029, UC-48).
 *
 * @module modules/sst/application/use-cases/cipa/CloseElectoralProcessUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import CipaRepository from '../../../domain/repositories/CipaRepository';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../../errors';
import { toElectoralProcessDTO } from '../../../infrastructure/mappers/CipaMapper';

interface CloseElectoralProcessInput {
  processId: string | number;
  body: {
    total_votantes?: number;
    data_votacao?: string;
    atas_urls?: string[];
    resultados?: Array<{ employee_id: number; votos: number; eleito: boolean }>;
  };
}

class CloseElectoralProcessUseCase extends UseCase<CloseElectoralProcessInput, any> {
  private readonly cipaRepository: CipaRepository;

  public constructor(cipaRepository: CipaRepository) {
    super();
    this.cipaRepository = cipaRepository;
  }

  /**
   * @throws {NotFoundError} Processo não encontrado (404).
   * @throws {ValidationError} `resultados` ausente/vazio (400).
   * @throws {BusinessRuleError} Processo já encerrado (422 — não reabre apuração).
   */
  public async execute({ processId, body }: CloseElectoralProcessInput): Promise<any> {
    const processo = await this.cipaRepository.findElectoralProcessById(processId);
    if (!processo) throw new NotFoundError('Processo eleitoral não encontrado.');
    if (processo.total_votantes != null) throw new BusinessRuleError('Este processo eleitoral já foi encerrado.');
    if (!Array.isArray(body.resultados) || body.resultados.length === 0) {
      throw new ValidationError('resultados (lista de candidatos com votos/eleito) é obrigatório.');
    }

    const candidatosExistentes = await this.cipaRepository.findCandidatesByProcessId(processo.id);
    const porEmployee = new Map(candidatosExistentes.map((c: any) => [c.employee_id, c]));
    for (const resultado of body.resultados) {
      const candidato = porEmployee.get(resultado.employee_id);
      if (!candidato) continue;
      await this.cipaRepository.updateCandidate(candidato.id, { votos: resultado.votos, eleito: resultado.eleito });
    }

    const atualizado = await this.cipaRepository.updateElectoralProcess(processo.id, {
      total_votantes: body.total_votantes ?? candidatosExistentes.length,
      data_votacao: body.data_votacao ?? processo.data_votacao,
      atas_urls: Array.isArray(body.atas_urls) ? body.atas_urls.join('|') : processo.atas_urls
    });
    return toElectoralProcessDTO(atualizado);
  }
}

export = CloseElectoralProcessUseCase;
