/**
 * Caso de uso para listar os fornecedores vinculados a um item.
 *
 * @module modules/items/application/use-cases/ListItemSuppliersUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import ItemRepository from '../../domain/repositories/ItemRepository';
import ItemSupplierRepository from '../../domain/repositories/ItemSupplierRepository';

interface ListItemSuppliersInput {
  itemId: string;
}

class ListItemSuppliersUseCase extends UseCase<ListItemSuppliersInput, any[]> {
  private readonly itemRepository: ItemRepository;
  private readonly itemSupplierRepository: ItemSupplierRepository;

  public constructor(itemRepository: ItemRepository, itemSupplierRepository: ItemSupplierRepository) {
    super();
    this.itemRepository = itemRepository;
    this.itemSupplierRepository = itemSupplierRepository;
  }

  /**
   * Lista os vinculos ativos de fornecedores de um item.
   *
   * @param input - itemId do item.
   * @returns Lista de vinculos com dados do fornecedor.
   * @throws NotFoundError se o item nao existir.
   */
  public async execute(input: ListItemSuppliersInput): Promise<any[]> {
    const item = await this.itemRepository.findById(input.itemId);
    if (!item) {
      throw new NotFoundError('Item nao encontrado.');
    }

    return this.itemSupplierRepository.listByItem(input.itemId);
  }
}

export = ListItemSuppliersUseCase;
