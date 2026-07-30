/**
 * Caso de uso para consultar rastreabilidade de uma ordem de producao.
 *
 * @module modules/traceability/application/use-cases/GetProductionOrderTraceabilityUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import TraceabilityRepository from '../../domain/repositories/TraceabilityRepository';

/**
 * Retorna os detalhes de uma ordem de producao com todos os insumos
 * (lotes de materia-prima) consumidos durante a fabricacao.
 */
class GetProductionOrderTraceabilityUseCase extends UseCase<number, any | null> {
  private readonly traceabilityRepository: TraceabilityRepository;

  public constructor(traceabilityRepository: TraceabilityRepository) {
    super();
    this.traceabilityRepository = traceabilityRepository;
  }

  /**
   * Executa a consulta de rastreabilidade por ordem de producao.
   *
   * @param productionOrderId - ID numerico da ordem de producao.
   * @returns Dados da OP com insumos ou null se nao existir.
   */
  public async execute(productionOrderId: number): Promise<any | null> {
    return this.traceabilityRepository.getProductionOrderDetails(productionOrderId);
  }
}

export = GetProductionOrderTraceabilityUseCase;

