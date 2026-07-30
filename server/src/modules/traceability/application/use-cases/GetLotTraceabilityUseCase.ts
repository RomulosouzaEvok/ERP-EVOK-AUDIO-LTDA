/**
 * Caso de uso para consultar rastreabilidade de um lote.
 *
 * @module modules/traceability/application/use-cases/GetLotTraceabilityUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import TraceabilityRepository from '../../domain/repositories/TraceabilityRepository';

/**
 * Retorna o historico completo de um lote, desde a entrada ate o consumo
 * em ordens de producao.
 */
class GetLotTraceabilityUseCase extends UseCase<string, any[]> {
  private readonly traceabilityRepository: TraceabilityRepository;

  public constructor(traceabilityRepository: TraceabilityRepository) {
    super();
    this.traceabilityRepository = traceabilityRepository;
  }

  /**
   * Executa a consulta de rastreabilidade por lote.
   *
   * @param lotId - UUID do lote.
   * @returns Lista de movimentos do lote.
   */
  public async execute(lotId: string): Promise<any[]> {
    return this.traceabilityRepository.getLotHistory(lotId);
  }
}

export = GetLotTraceabilityUseCase;

