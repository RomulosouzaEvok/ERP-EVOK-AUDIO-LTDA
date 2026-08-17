const UseCase = require('../../../../shared/application/UseCase');
const { ValidationError } = require('../../../../errors');
const ManualStockAdjustmentService = require('../../../../services/manualStockAdjustmentService');
import type { IProductRepository } from '../../domain/repositories/ProductRepository';
import type { Transaction } from 'sequelize';

/**
 * Registra uma movimentacao manual de estoque para o endpoint legado
 * `POST /api/products/movements`.
 *
 * CASE-006: este endpoint nao pode mais ajustar `products.quantity` sem
 * deposito. Ele delega ao mesmo servico fail-closed usado pelo mobile, que
 * resolve warehouse, faz dual-write e bloqueia saida sem lote quando ha saldo
 * em quarentena/bloqueado.
 */
class RegisterProductMovementUseCase extends UseCase {
  private productRepository: IProductRepository;

  constructor(productRepository: IProductRepository) {
    super();
    this.productRepository = productRepository;
  }

  async execute({ product_id, type, quantity, warehouse_code, description, userId, transaction }: {
    product_id: number | string;
    type: 'in' | 'out';
    quantity: number;
    warehouse_code?: string;
    description?: string;
    userId: number;
    transaction: Transaction;
  }) {
    const qty = Number(quantity);
    if (!product_id || !type || !warehouse_code || !Number.isFinite(qty)) {
      throw new ValidationError('Produto, tipo, quantidade e deposito sao obrigatorios');
    }
    if (qty <= 0) {
      throw new ValidationError('Quantidade deve ser maior que zero');
    }

    const result = await ManualStockAdjustmentService.adjustWithWarehouse({
      productId: product_id,
      type,
      quantity: qty,
      userId,
      reason: description || 'Movimentacao manual',
      transaction,
      warehouseCode: warehouse_code,
    });

    return {
      movement: { id: result.movementId },
      product: result.product,
      previousQuantity: result.quantityBefore,
      newQuantity: result.quantityAfter,
    };
  }
}

module.exports = RegisterProductMovementUseCase;
