/**
 * Use case: solicitar transferência de saldo entre depósitos.
 *
 * @module modules/inventory/application/use-cases/CreateWarehouseTransferUseCase
 *
 * Cobre `POST /api/inventory/transfers`. Cria a transferência em
 * `status='pending'` — não altera nenhum saldo (nem `products.quantity`
 * nem `ProductWarehouseStock`) até a aprovação de um gestor do módulo
 * `estoque` (docs/business/BUSINESS_RULES.md §12 itens 6 e 8,
 * docs/business/01-USE_CASES.md UC-42 Fluxo F).
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { WarehouseTransfer, Product } = require('../../../../models/index');
const WarehouseStockService: any = require('../../../../services/warehouseStockService');

import UseCase from '../../../../shared/application/UseCase';
import { ValidationError, NotFoundError } from '../../../../errors';

interface CreateWarehouseTransferInput {
  product_id: number;
  from_warehouse_code: string;
  to_warehouse_code: string;
  quantity: number;
  reason: string;
  userId: number;
}

class CreateWarehouseTransferUseCase extends UseCase<CreateWarehouseTransferInput, any> {
  /**
   * @param input - Dados da solicitação de transferência.
   * @returns Transferência criada (`status = 'pending'`).
   * @throws {ValidationError} Se `quantity` não for positiva, `reason` estiver vazio ou origem/destino forem iguais.
   * @throws {NotFoundError} Se o produto ou algum dos depósitos não existir/estiver inativo.
   */
  public async execute(input: CreateWarehouseTransferInput): Promise<any> {
    const quantity = Number(input.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new ValidationError('quantity deve ser um número maior que zero.');
    }

    const reason = String(input.reason || '').trim();
    if (!reason) {
      throw new ValidationError('reason (motivo) é obrigatório para solicitar uma transferência entre depósitos.');
    }

    if (String(input.from_warehouse_code).trim().toUpperCase() === String(input.to_warehouse_code).trim().toUpperCase()) {
      throw new ValidationError('Depósito de origem e destino não podem ser o mesmo.');
    }

    const product = await Product.findByPk(input.product_id);
    if (!product) {
      throw new NotFoundError(`Produto ID ${input.product_id} não encontrado.`);
    }

    const fromWarehouse = await WarehouseStockService.getWarehouseByCode(input.from_warehouse_code);
    const toWarehouse = await WarehouseStockService.getWarehouseByCode(input.to_warehouse_code);

    const transfer = await WarehouseTransfer.create({
      product_id: input.product_id,
      from_warehouse_id: fromWarehouse.id,
      to_warehouse_id: toWarehouse.id,
      quantity,
      reason,
      user_id: input.userId,
      status: 'pending',
    });

    return transfer;
  }
}

export = CreateWarehouseTransferUseCase;
