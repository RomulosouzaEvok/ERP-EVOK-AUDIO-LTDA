/**
 * Contrato do repositorio de vinculos item x fornecedor (catalogo N:N).
 *
 * @module modules/items/domain/repositories/ItemSupplierRepository
 */

class ItemSupplierRepository {
  /** Lista vinculos ativos de um item, com dados do fornecedor. */
  public async listByItem(_itemId: string): Promise<any[]> {
    throw new Error('ItemSupplierRepository.listByItem nao implementado.');
  }

  /** Lista vinculos ativos de um fornecedor, com dados do item. */
  public async listBySupplier(_supplierId: number): Promise<any[]> {
    throw new Error('ItemSupplierRepository.listBySupplier nao implementado.');
  }

  /** Busca um vinculo por id. */
  public async findById(_linkId: number): Promise<any | null> {
    throw new Error('ItemSupplierRepository.findById nao implementado.');
  }

  /** Busca um vinculo pelo par (item_id, supplier_id), incluindo inativos. */
  public async findByItemAndSupplier(_itemId: string, _supplierId: number, _transaction?: any): Promise<any | null> {
    throw new Error('ItemSupplierRepository.findByItemAndSupplier nao implementado.');
  }

  /** Busca o vinculo de fornecedor preferencial ativo de um item (ou null). */
  public async findPreferredByItem(_itemId: string): Promise<any | null> {
    throw new Error('ItemSupplierRepository.findPreferredByItem nao implementado.');
  }

  /** Cria um novo vinculo item x fornecedor. */
  public async create(_data: Record<string, unknown>, _transaction?: any): Promise<any> {
    throw new Error('ItemSupplierRepository.create nao implementado.');
  }

  /** Atualiza um vinculo existente. */
  public async update(_linkId: number, _data: Record<string, unknown>, _transaction?: any): Promise<any> {
    throw new Error('ItemSupplierRepository.update nao implementado.');
  }

  /** Zera o flag `preferred` de todos os vinculos de um item, exceto o informado. */
  public async clearPreferredForItem(_itemId: string, _exceptLinkId?: number, _transaction?: any): Promise<void> {
    throw new Error('ItemSupplierRepository.clearPreferredForItem nao implementado.');
  }

  /** Agrega historico de compras de um item por fornecedor. */
  public async getPurchaseHistoryByItem(_itemId: string): Promise<any[]> {
    throw new Error('ItemSupplierRepository.getPurchaseHistoryByItem nao implementado.');
  }

  /**
   * Busca um fornecedor pelo id (leitura auxiliar cross-module — o model
   * `Supplier` pertence ao modulo `suppliers`, nao a `items`; usado apenas
   * para validar a existencia do fornecedor antes de criar o vinculo).
   */
  public async findSupplierById(_supplierId: number): Promise<any | null> {
    throw new Error('ItemSupplierRepository.findSupplierById nao implementado.');
  }
}

export = ItemSupplierRepository;
