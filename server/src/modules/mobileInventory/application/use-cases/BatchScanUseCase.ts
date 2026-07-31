/**
 * Use case: registrar em lote movimentações de estoque via scanner mobile.
 *
 * Cada item da lista é processado com `InventoryService.adjust` (lock
 * pessimista, validação e persistência atômica), dentro de uma única
 * transação Sequelize fornecida pelo controller — se qualquer item falhar,
 * toda a transação deve ser revertida pelo chamador.
 *
 * @module modules/mobileInventory/application/use-cases/BatchScanUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ValidationError, NotFoundError } from '../../../../errors';
import MobileInventoryRepository from '../../domain/repositories/MobileInventoryRepository';

const InventoryService: any = require('../../../../services/inventoryService');

interface BatchScanItem {
  product_code?: string;
  quantity?: number | string;
  type?: string;
  description?: string;
}

interface BatchScanInput {
  items?: BatchScanItem[];
  userId: number;
  transaction: unknown;
}

class BatchScanUseCase extends UseCase<BatchScanInput, any> {
  private readonly mobileInventoryRepository: MobileInventoryRepository;

  /** @param mobileInventoryRepository - Repositorio de inventário mobile. */
  public constructor(mobileInventoryRepository: MobileInventoryRepository) {
    super();
    this.mobileInventoryRepository = mobileInventoryRepository;
  }

  /**
   * @param input - Lista de itens a processar, id do usuário e transação ativa.
   * @returns Quantidade de itens processados e detalhes de cada movimentação.
   * @throws {ValidationError} Se a lista estiver vazia ou algum item tiver dados inválidos.
   * @throws {NotFoundError} Se algum produto referenciado não existir.
   */
  public async execute(input: BatchScanInput): Promise<any> {
    const { items, userId, transaction } = input;

    if (!items || items.length === 0) {
      throw new ValidationError('Lista de itens é obrigatória');
    }

    const results: any[] = [];
    for (const item of items) {
      const { product_code, quantity, type, description } = item;
      if (!product_code || quantity === undefined || !type) {
        throw new ValidationError('Cada item deve ter product_code, quantity e type');
      }
      const qty = parseFloat(String(quantity));
      if (qty <= 0) {
        throw new ValidationError(`Quantidade inválida para ${product_code}`);
      }
      if (!['in', 'out'].includes(type)) {
        throw new ValidationError(`Tipo inválido para ${product_code}`);
      }

      const product = await this.mobileInventoryRepository.findProductByCode(product_code);
      if (!product) {
        throw new NotFoundError(`Produto ${product_code} não encontrado`);
      }

      const movement = await InventoryService.adjust(
        product.id,
        type,
        qty,
        userId,
        description || `Batch scan ${type}`,
        transaction
      );
      results.push({ product_code, product_name: product.name, type, quantity: qty, movement_id: movement.movementId });
    }

    return { items_processed: results.length, results };
  }
}

export = BatchScanUseCase;
