/**
 * Caso de uso para vincular um fornecedor a um item (catalogo N:N).
 *
 * @module modules/items/application/use-cases/CreateItemSupplierUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ConflictError, NotFoundError } from '../../../../errors';
import ItemRepository from '../../domain/repositories/ItemRepository';
import ItemSupplierRepository from '../../domain/repositories/ItemSupplierRepository';
const { sequelize } = require('../../../../models/index');

interface CreateItemSupplierInput {
  itemId: string;
  supplier_id: number;
  unit_price?: number;
  currency?: string;
  lead_time_days?: number;
  moq?: number;
  supplier_item_code?: string;
  preferred?: boolean;
  notes?: string;
}

class CreateItemSupplierUseCase extends UseCase<CreateItemSupplierInput, any> {
  private readonly itemRepository: ItemRepository;
  private readonly itemSupplierRepository: ItemSupplierRepository;

  public constructor(itemRepository: ItemRepository, itemSupplierRepository: ItemSupplierRepository) {
    super();
    this.itemRepository = itemRepository;
    this.itemSupplierRepository = itemSupplierRepository;
  }

  /**
   * Cria um vinculo item x fornecedor.
   *
   * @param input - Dados do vinculo.
   * @returns Vinculo criado.
   * @throws NotFoundError se item ou fornecedor nao existirem.
   * @throws ConflictError se o vinculo ja existir.
   */
  public async execute(input: CreateItemSupplierInput): Promise<any> {
    const item = await this.itemRepository.findById(input.itemId);
    if (!item) {
      throw new NotFoundError('Item nao encontrado.');
    }

    const supplier = await this.itemSupplierRepository.findSupplierById(input.supplier_id);
    if (!supplier) {
      throw new NotFoundError('Fornecedor nao encontrado.');
    }

    const existing = await this.itemSupplierRepository.findByItemAndSupplier(input.itemId, input.supplier_id);
    if (existing) {
      throw new ConflictError('Vinculo item-fornecedor ja existe.');
    }

    const transaction = await sequelize.transaction();
    try {
      const created = await this.itemSupplierRepository.create({
        item_id: input.itemId,
        supplier_id: input.supplier_id,
        unit_price: input.unit_price ?? null,
        currency: input.currency ?? 'BRL',
        lead_time_days: input.lead_time_days ?? null,
        moq: input.moq ?? null,
        supplier_item_code: input.supplier_item_code ?? null,
        preferred: input.preferred ?? false,
        active: true,
        notes: input.notes ?? null,
      }, transaction);

      if (input.preferred) {
        await this.itemSupplierRepository.clearPreferredForItem(input.itemId, created.id, transaction);
      }

      await transaction.commit();
      return this.itemSupplierRepository.findById(created.id);
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  }
}

export = CreateItemSupplierUseCase;
