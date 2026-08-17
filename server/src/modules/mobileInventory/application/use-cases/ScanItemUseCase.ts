/**
 * Use case: registra uma movimentacao de estoque via scanner mobile
 * (entrada/saida de um unico item).
 *
 * CASE-006: o scan mobile agora exige deposito e passa pelo mesmo dual-write
 * de estoque por deposito usado pelo modulo de inventario.
 */

import UseCase from '../../../../shared/application/UseCase';
import { ValidationError, NotFoundError } from '../../../../errors';
import MobileInventoryRepository from '../../domain/repositories/MobileInventoryRepository';

const ManualStockAdjustmentService: any = require('../../../../services/manualStockAdjustmentService');

interface ScanItemInput {
  product_code?: string;
  quantity?: number | string;
  type?: string;
  warehouse_code?: string;
  description?: string;
  userId: number;
  transaction: any;
}

class ScanItemUseCase extends UseCase<ScanItemInput, any> {
  private readonly mobileInventoryRepository: MobileInventoryRepository;

  public constructor(mobileInventoryRepository: MobileInventoryRepository) {
    super();
    this.mobileInventoryRepository = mobileInventoryRepository;
  }

  public async execute(input: ScanItemInput): Promise<any> {
    const { product_code, quantity, type, warehouse_code, description, userId, transaction } = input;

    if (!product_code || quantity === undefined || !type || !warehouse_code) {
      throw new ValidationError('Codigo do produto, quantidade, tipo e deposito sao obrigatorios');
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new ValidationError('Quantidade deve ser maior que zero');
    }
    if (!['in', 'out'].includes(type)) {
      throw new ValidationError('Tipo deve ser in ou out');
    }

    const product = await this.mobileInventoryRepository.findProductByCode(product_code);
    if (!product) {
      throw new NotFoundError('Produto nao encontrado');
    }
    if (type === 'out' && Number(product.quantity) < qty) {
      throw new ValidationError(`Estoque insuficiente. Disponivel: ${product.quantity}`);
    }

    const movement = await ManualStockAdjustmentService.adjustWithWarehouse({
      productId: product.id,
      type,
      quantity: qty,
      userId,
      reason: description || `Scan mobile ${type}`,
      transaction,
      warehouseCode: warehouse_code,
    });

    return {
      product: { id: product.id, name: product.name, code: product.code },
      movement,
      new_quantity: movement.quantityAfter,
    };
  }
}

export = ScanItemUseCase;
