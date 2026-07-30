/**
 * Contrato do repositorio de rastreabilidade industrial.
 *
 * @module modules/traceability/domain/repositories/TraceabilityRepository
 */

interface ItemTraceabilityEntry {
  item_id: string;
  codigo: string;
  descricao: string;
  tipo: string;
  movimento_tipo: string;
  quantidade: number;
  lote_id: string | null;
  codigo_lote: string | null;
  numero_serie: string | null;
  origem_tabela: string;
  origem_id: string;
  criado_em: Date;
}

interface LotTraceabilityEntry {
  lote_id: string;
  codigo_lote: string;
  item_id: string;
  codigo_item: string;
  descricao_item: string;
  tipo: string;
  movimento_tipo: string;
  quantidade: number;
  origem_tabela: string;
  origem_id: string;
  criado_em: Date;
}

interface ProductionOrderTraceabilityEntry {
  op_id: string;
  op_codigo: string;
  item_id: string;
  codigo_item: string;
  descricao_item: string;
  tipo: string;
  quantidade_planejada: number;
  quantidade_produzida: number;
  status: string;
  insumos: Array<{
    lote_id: string;
    codigo_lote: string;
    item_id: string;
    codigo_item: string;
    descricao_item: string;
    quantidade_consumida: number;
  }>;
}

class TraceabilityRepository {
  /**
   * Retorna o histórico de movimentações de um item.
   *
   * @param itemId - UUID do item.
   * @returns Lista de movimentos ordenados por data.
   */
  public async getItemHistory(_itemId: string): Promise<ItemTraceabilityEntry[]> {
    throw new Error('TraceabilityRepository.getItemHistory nao implementado.');
  }

  /**
   * Retorna o histórico completo de um lote: entrada, consumo, producao.
   *
   * @param lotId - UUID do lote.
   * @returns Lista de movimentos do lote.
   */
  public async getLotHistory(_lotId: string): Promise<LotTraceabilityEntry[]> {
    throw new Error('TraceabilityRepository.getLotHistory nao implementado.');
  }

  /**
   * Retorna os detalhes de rastreabilidade de uma ordem de producao:
   * dados da OP + todos os insumos consumidos.
   *
   * @param productionOrderId - UUID da ordem de producao.
   * @returns Dados da OP com insumos.
   */
  public async getProductionOrderDetails(_productionOrderId: string): Promise<ProductionOrderTraceabilityEntry | null> {
    throw new Error('TraceabilityRepository.getProductionOrderDetails nao implementado.');
  }
}

export = TraceabilityRepository;

