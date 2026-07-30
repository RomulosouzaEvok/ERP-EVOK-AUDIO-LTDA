/**
 * Contrato do repositorio de estruturas de itens.
 *
 * @module modules/items/domain/repositories/ItemEstruturaRepository
 */

class ItemEstruturaRepository {
  /** Cria uma ligacao de estrutura. */
  public async create(_data: Record<string, unknown>, _transaction?: any): Promise<any> {
    throw new Error('ItemEstruturaRepository.create nao implementado.');
  }

  /** Lista filhos diretos de um item pai. */
  public async findActiveByParentId(_itemPaiId: string): Promise<any[]> {
    throw new Error('ItemEstruturaRepository.findActiveByParentId nao implementado.');
  }

  /** Lista todas as arestas ativas da estrutura. */
  public async listActiveEdges(): Promise<any[]> {
    throw new Error('ItemEstruturaRepository.listActiveEdges nao implementado.');
  }

  /** Verifica se existe caminho entre dois itens. */
  public async hasPathBetween(_fromItemId: string, _toItemId: string): Promise<boolean> {
    throw new Error('ItemEstruturaRepository.hasPathBetween nao implementado.');
  }

  /** Verifica se o item possui vinculo ativo como pai ou componente em uma estrutura. */
  public async hasActiveParentOrComponent(_itemId: string): Promise<boolean> {
    throw new Error('ItemEstruturaRepository.hasActiveParentOrComponent nao implementado.');
  }
}

export = ItemEstruturaRepository;
