/**
 * Caso de uso para atualizar um vinculo item x fornecedor.
 *
 * @module modules/items/application/use-cases/UpdateItemSupplierUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import ItemSupplierRepository from '../../domain/repositories/ItemSupplierRepository';
const { sequelize } = require('../../../../models/index');

interface UpdateItemSupplierInput {
  itemId: string;
  linkId: number;
  unit_price?: number;
  currency?: string;
  lead_time_days?: number;
  moq?: number;
  supplier_item_code?: string;
  preferred?: boolean;
  notes?: string;
}

class UpdateItemSupplierUseCase extends UseCase<UpdateItemSupplierInput, any> {
  private readonly itemSupplierRepository: ItemSupplierRepository;

  public constructor(itemSupplierRepository: ItemSupplierRepository) {
    super();
    this.itemSupplierRepository = itemSupplierRepository;
  }

  /**
   * Atualiza campos comerciais do vinculo item x fornecedor.
   *
   * @param input - Dados a atualizar.
   * @returns Vinculo atualizado.
   * @throws NotFoundError se o vinculo nao existir ou nao pertencer ao item informado.
   */
  public async execute(input: UpdateItemSupplierInput): Promise<any> {
    const existing = await this.itemSupplierRepository.findById(input.linkId);
    if (!existing || String(existing.item_id) !== String(input.itemId)) {
      throw new NotFoundError('Vinculo item-fornecedor nao encontrado.');
    }

    const { itemId, linkId, preferred, ...rest } = input;
    const updateData: Record<string, unknown> = { ...rest };
    if (preferred !== undefined) {
      updateData.preferred = preferred;
    }

    const transaction = await sequelize.transaction();
    try {
      await this.itemSupplierRepository.update(linkId, updateData, transaction);

      if (preferred) {
        await this.itemSupplierRepository.clearPreferredForItem(itemId, linkId, transaction);
      }

      await transaction.commit();
      return this.itemSupplierRepository.findById(linkId);
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  }
}

export = UpdateItemSupplierUseCase;
