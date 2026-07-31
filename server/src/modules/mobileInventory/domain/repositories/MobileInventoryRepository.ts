/**
 * Contrato do repositorio de Inventário Mobile (coletor/scanner).
 *
 * A alteração efetiva de `Product.quantity` permanece centralizada em
 * `server/src/services/inventoryService.ts` (`InventoryService.adjust`),
 * não duplicada neste repositório — este cobre apenas busca de produto por
 * código/id e listagem de movimentações.
 *
 * @module modules/mobileInventory/domain/repositories/MobileInventoryRepository
 */

class MobileInventoryRepository {
  /** @param code - Código ou id do produto. @returns Produto encontrado ou null. @throws {Error} Se nao implementado. */
  public async findProductByCode(code: string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('MobileInventoryRepository.findProductByCode não implementado.');
  }

  /**
   * @param pagination - Paginacao (limit, offset).
   * @returns Linhas encontradas e contagem total.
   * @throws {Error} Se nao implementado.
   */
  public async listMovements(pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('MobileInventoryRepository.listMovements não implementado.');
  }
}

export = MobileInventoryRepository;
