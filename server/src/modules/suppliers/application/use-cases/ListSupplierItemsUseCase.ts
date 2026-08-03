/**
 * Caso de uso para listar os itens vinculados a um fornecedor (catalogo N:N).
 *
 * @module modules/suppliers/application/use-cases/ListSupplierItemsUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import SuppliersRepository from '../../domain/repositories/SuppliersRepository';
import ItemSupplierRepository from '../../../items/domain/repositories/ItemSupplierRepository';

interface ListSupplierItemsInput {
  supplierId: number;
}

class ListSupplierItemsUseCase extends UseCase<ListSupplierItemsInput, any[]> {
  private readonly suppliersRepository: SuppliersRepository;
  private readonly itemSupplierRepository: ItemSupplierRepository;

  public constructor(suppliersRepository: SuppliersRepository, itemSupplierRepository: ItemSupplierRepository) {
    super();
    this.suppliersRepository = suppliersRepository;
    this.itemSupplierRepository = itemSupplierRepository;
  }

  /**
   * Lista os vinculos ativos de itens de um fornecedor.
   *
   * @param input - supplierId do fornecedor.
   * @returns Lista de vinculos com dados do item.
   * @throws NotFoundError se o fornecedor nao existir.
   */
  public async execute(input: ListSupplierItemsInput): Promise<any[]> {
    const supplier = await this.suppliersRepository.findById(input.supplierId);
    if (!supplier) {
      throw new NotFoundError('Fornecedor nao encontrado.');
    }

    return this.itemSupplierRepository.listBySupplier(input.supplierId);
  }
}

export = ListSupplierItemsUseCase;
