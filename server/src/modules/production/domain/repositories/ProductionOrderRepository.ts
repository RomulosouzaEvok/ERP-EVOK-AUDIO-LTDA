/**
 * Contrato do repositorio de Ordens de Producao.
 *
 * @module modules/production/domain/repositories/ProductionOrderRepository
 */

export interface ProductionListFilters {
  status?: string;
  product_id?: number;
  priority?: string;
  start_date?: string;
  end_date?: string;
  limit: number;
  offset: number;
}

class ProductionOrderRepository {
  /**
   * Lista OPs com filtros e resumo.
   *
   * @param filters - Filtros e paginacao.
   * @returns Linhas, contagem e totais.
   * @throws {Error} Se nao implementado pela infraestrutura.
   */
  public async list(filters: ProductionListFilters): Promise<{ rows: any[]; count: number; totals: number[] }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /** @param id - ID da OP. @returns OP encontrada ou null. @throws {Error} Se nao implementado. */
  public async findById(id: number): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /** @param id - ID da OP. @returns OP sem includes ou null. @throws {Error} Se nao implementado. */
  public async findRawById(id: number): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /** @param id - ID da OP. @param transaction - Transacao ativa. @returns OP travada ou null. @throws {Error} Se nao implementado. */
  public async findByIdForUpdate(id: number, transaction: any): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /** @param yearPrefix - Prefixo anual. @param transaction - Transacao opcional. @returns Total encontrado. @throws {Error} Se nao implementado. */
  public async countByOrderNumberPrefix(yearPrefix: string, transaction?: any): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /** @param data - Dados da OP. @param transaction - Transacao opcional. @returns OP criada. @throws {Error} Se nao implementado. */
  public async create(data: Record<string, unknown>, transaction?: any): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /** @param id - ID da OP. @param data - Campos. @param transaction - Transacao opcional. @returns Linhas afetadas. @throws {Error} Se nao implementado. */
  public async update(id: number, data: Record<string, unknown>, transaction?: any): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /** @param id - ID da OP. @returns Linhas removidas. @throws {Error} Se nao implementado. */
  public async destroy(id: number): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /** @param id - ID do produto. @param transaction - Transacao opcional. @returns Produto ou null. @throws {Error} Se nao implementado. */
  public async findProductById(id: number, transaction?: any): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }

  /** @param filters - Filtros do relatorio. @returns OPs do relatorio. @throws {Error} Se nao implementado. */
  public async listForReport(filters: Record<string, unknown>): Promise<any[]> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Nao implementado');
  }
}

export = ProductionOrderRepository;
