/**
 * Caso de uso para obter o historico agregado de compras de um item por fornecedor.
 *
 * @module modules/items/application/use-cases/GetItemPurchaseHistoryUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import ItemRepository from '../../domain/repositories/ItemRepository';
import ItemSupplierRepository from '../../domain/repositories/ItemSupplierRepository';

interface GetItemPurchaseHistoryInput {
  itemId: string;
}

class GetItemPurchaseHistoryUseCase extends UseCase<GetItemPurchaseHistoryInput, any[]> {
  private readonly itemRepository: ItemRepository;
  private readonly itemSupplierRepository: ItemSupplierRepository;

  public constructor(itemRepository: ItemRepository, itemSupplierRepository: ItemSupplierRepository) {
    super();
    this.itemRepository = itemRepository;
    this.itemSupplierRepository = itemSupplierRepository;
  }

  /**
   * Retorna o historico de compras do item, agregado por fornecedor.
   *
   * @param input - itemId do item.
   * @returns Lista agregada por fornecedor (orders_count, quantidades, precos).
   * @throws NotFoundError se o item nao existir.
   */
  public async execute(input: GetItemPurchaseHistoryInput): Promise<any[]> {
    const item = await this.itemRepository.findById(input.itemId);
    if (!item) {
      throw new NotFoundError('Item nao encontrado.');
    }

    return this.itemSupplierRepository.getPurchaseHistoryByItem(input.itemId);
  }
}

export = GetItemPurchaseHistoryUseCase;
