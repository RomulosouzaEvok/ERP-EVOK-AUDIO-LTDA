/**
 * Contrato do repositorio de itens industriais.
 *
 * @module modules/items/domain/repositories/ItemRepository
 */

interface ItemListOptions {
  limit: number;
  offset: number;
  search?: string;
  tipo?: string;
  status?: string;
}

class ItemRepository {
  /** Lista itens com filtros e paginacao. */
  public async list(_options: ItemListOptions): Promise<{ rows: any[]; count: number }> {
    throw new Error('ItemRepository.list nao implementado.');
  }

  /** Busca item por id. */
  public async findById(_id: string): Promise<any | null> {
    throw new Error('ItemRepository.findById nao implementado.');
  }

  /** Busca item por codigo. */
  public async findByCode(_code: string): Promise<any | null> {
    throw new Error('ItemRepository.findByCode nao implementado.');
  }

  /** Cria um novo item. */
  public async create(_data: Record<string, unknown>, _transaction?: any): Promise<any> {
    throw new Error('ItemRepository.create nao implementado.');
  }

  /** Atualiza um item existente. */
  public async update(_id: string, _data: Record<string, unknown>, _transaction?: any): Promise<any> {
    throw new Error('ItemRepository.update nao implementado.');
  }

  /** Lista posicoes de estoque MRP. */
  public async listMrpInventoryPositions(_itemIds?: string[]): Promise<any[]> {
    throw new Error('ItemRepository.listMrpInventoryPositions nao implementado.');
  }

  /**
   * Filtra, dentre os ids informados, quais itens estao marcados com o
   * opt-in de conversao automatica do MRP (`items.conversao_automatica = true`).
   *
   * @param _itemIds - Ids (UUID) dos itens a verificar.
   * @returns Conjunto dos ids que tem a flag ativa.
   */
  public async listAutoConvertItemIds(_itemIds: string[]): Promise<Set<string>> {
    throw new Error('ItemRepository.listAutoConvertItemIds nao implementado.');
  }
}

export = ItemRepository;
