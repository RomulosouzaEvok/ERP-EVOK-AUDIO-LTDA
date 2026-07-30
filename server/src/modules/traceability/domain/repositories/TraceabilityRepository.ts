/**
 * Contrato do repositorio de rastreabilidade industrial.
 *
 * @module modules/traceability/domain/repositories/TraceabilityRepository
 */

interface ItemTraceabilityEntry {
  item_id: number;
  codigo: string | null;
  descricao: string | null;
  tipo: string;
  movimento_tipo: string;
  quantidade: number;
  lote_id: number | null;
  codigo_lote: string | null;
  numero_serie: string | null;
  origem_tabela: string | null;
  origem_id: number | null;
  criado_em: Date | null;
  metadata?: Record<string, unknown>;
}

interface LotTraceabilityEntry {
  lote_id: number;
  codigo_lote: string;
  item_id: number;
  codigo_item: string;
  descricao_item: string;
  tipo: string;
  movimento_tipo: string;
  quantidade: number;
  origem_tabela: string | null;
  origem_id: number | null;
  criado_em: Date | null;
  metadata?: Record<string, unknown>;
}

interface ProductionOrderTraceabilityEntry {
  op_id: number;
  op_codigo: string;
  item_id: number;
  codigo_item: string;
  descricao_item: string;
  tipo: string;
  quantidade_planejada: number;
  quantidade_produzida: number;
  status: string;
  movements: Array<Record<string, unknown>>;
  generated_lots: Array<Record<string, unknown>>;
  generated_serial_numbers: Array<Record<string, unknown>>;
  insumos: Array<{
    lote_id: number;
    codigo_lote: string;
    item_id: number;
    codigo_item: string;
    descricao_item: string;
    quantidade_consumida: number;
    consumido_em?: Date | null;
    usuario_id?: number | null;
    observacoes?: string | null;
  }>;
}

class TraceabilityRepository {
  /**
   * Retorna o histórico de movimentações de um item.
   *
   * @param itemId - ID numerico do item/produto.
   * @returns Lista de movimentos ordenados por data.
   */
  public async getItemHistory(_itemId: number): Promise<ItemTraceabilityEntry[]> {
    throw new Error('TraceabilityRepository.getItemHistory nao implementado.');
  }

  /**
   * Retorna o histórico completo de um lote: entrada, consumo, producao.
   *
   * @param lotId - ID numerico do lote.
   * @returns Lista de movimentos do lote.
   */
  public async getLotHistory(_lotId: number): Promise<LotTraceabilityEntry[]> {
    throw new Error('TraceabilityRepository.getLotHistory nao implementado.');
  }

  /**
   * Retorna os detalhes de rastreabilidade de uma ordem de producao:
   * dados da OP + todos os insumos consumidos.
   *
   * @param productionOrderId - ID numerico da ordem de producao.
   * @returns Dados da OP com insumos.
   */
  public async getProductionOrderDetails(_productionOrderId: number): Promise<ProductionOrderTraceabilityEntry | null> {
    throw new Error('TraceabilityRepository.getProductionOrderDetails nao implementado.');
  }
}

export = TraceabilityRepository;

