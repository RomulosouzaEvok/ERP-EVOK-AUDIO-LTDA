/**
 * Use case: registra movimentacoes em lote via scanner mobile.
 *
 * CASE-006: cada item precisa informar deposito para que Product.quantity e
 * product_warehouse_stock sejam atualizados atomica e consistentemente.
 */

import UseCase from '../../../../shared/application/UseCase';
import { ValidationError, NotFoundError } from '../../../../errors';
import MobileInventoryRepository from '../../domain/repositories/MobileInventoryRepository';

const ManualStockAdjustmentService: any = require('../../../../services/manualStockAdjustmentService');

interface BatchScanItem {
  product_code?: string;
  quantity?: number | string;
  type?: string;
  warehouse_code?: string;
  description?: string;
}

interface BatchScanInput {
  items?: BatchScanItem[];
  warehouse_code?: string;
  userId: number;
  transaction: any;
}

class BatchScanUseCase extends UseCase<BatchScanInput, any> {
  private readonly mobileInventoryRepository: MobileInventoryRepository;

  public constructor(mobileInventoryRepository: MobileInventoryRepository) {
    super();
    this.mobileInventoryRepository = mobileInventoryRepository;
  }

  public async execute(input: BatchScanInput): Promise<any> {
    const { items, userId, transaction } = input;

    if (!items || items.length === 0) {
      throw new ValidationError('Lista de itens e obrigatoria');
    }

    const results: any[] = [];
    for (const item of items) {
      const { product_code, quantity, type, description } = item;
      const warehouseCode = item.warehouse_code ?? input.warehouse_code;

      if (!product_code || quantity === undefined || !type || !warehouseCode) {
        throw new ValidationError('Cada item deve ter product_code, quantity, type e warehouse_code');
      }

      const qty = Number(quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new ValidationError(`Quantidade invalida para ${product_code}`);
      }
      if (!['in', 'out'].includes(type)) {
        throw new ValidationError(`Tipo invalido para ${product_code}`);
      }

      const product = await this.mobileInventoryRepository.findProductByCode(product_code);
      if (!product) {
        throw new NotFoundError(`Produto ${product_code} nao encontrado`);
      }
      if (type === 'out' && Number(product.quantity) < qty) {
        throw new ValidationError(`Estoque insuficiente para ${product_code}. Disponivel: ${product.quantity}`);
      }

      const movement = await ManualStockAdjustmentService.adjustWithWarehouse({
        productId: product.id,
        type,
        quantity: qty,
        userId,
        reason: description || `Batch scan ${type}`,
        transaction,
        warehouseCode,
      });

      results.push({ product_code, product_name: product.name, type, quantity: qty, movement_id: movement.movementId });
    }

    return { items_processed: results.length, results };
  }
}

export = BatchScanUseCase;
