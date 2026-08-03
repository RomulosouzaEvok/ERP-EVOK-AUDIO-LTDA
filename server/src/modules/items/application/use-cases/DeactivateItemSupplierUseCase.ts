/**
 * Caso de uso para desativar (soft delete) um vinculo item x fornecedor.
 *
 * @module modules/items/application/use-cases/DeactivateItemSupplierUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import ItemSupplierRepository from '../../domain/repositories/ItemSupplierRepository';

interface DeactivateItemSupplierInput {
  itemId: string;
  linkId: number;
}

class DeactivateItemSupplierUseCase extends UseCase<DeactivateItemSupplierInput, any> {
  private readonly itemSupplierRepository: ItemSupplierRepository;

  public constructor(itemSupplierRepository: ItemSupplierRepository) {
    super();
    this.itemSupplierRepository = itemSupplierRepository;
  }

  /**
   * Desativa (active = false) um vinculo item x fornecedor.
   *
   * @param input - itemId e linkId do vinculo.
   * @returns Vinculo atualizado.
   * @throws NotFoundError se o vinculo nao existir ou nao pertencer ao item informado.
   */
  public async execute(input: DeactivateItemSupplierInput): Promise<any> {
    const existing = await this.itemSupplierRepository.findById(input.linkId);
    if (!existing || String(existing.item_id) !== String(input.itemId)) {
      throw new NotFoundError('Vinculo item-fornecedor nao encontrado.');
    }

    return this.itemSupplierRepository.update(input.linkId, { active: false, preferred: false });
  }
}

export = DeactivateItemSupplierUseCase;
