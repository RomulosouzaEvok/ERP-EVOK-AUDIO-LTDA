/**
 * Caso de uso para consultar rastreabilidade de um item.
 *
 * @module modules/traceability/application/use-cases/GetItemTraceabilityUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import TraceabilityRepository from '../../domain/repositories/TraceabilityRepository';

/**
 * Retorna o historico completo de movimentacoes de um item industrial,
 * incluindo detalhes de lotes e numeros de serie.
 */
class GetItemTraceabilityUseCase extends UseCase<string, any[]> {
  private readonly traceabilityRepository: TraceabilityRepository;

  public constructor(traceabilityRepository: TraceabilityRepository) {
    super();
    this.traceabilityRepository = traceabilityRepository;
  }

  /**
   * Executa a consulta de rastreabilidade por item.
   *
   * @param itemId - UUID do item canonico.
   * @returns Lista de movimentos do item.
   */
  public async execute(itemId: string): Promise<any[]> {
    return this.traceabilityRepository.getItemHistory(itemId);
  }
}

export = GetItemTraceabilityUseCase;

