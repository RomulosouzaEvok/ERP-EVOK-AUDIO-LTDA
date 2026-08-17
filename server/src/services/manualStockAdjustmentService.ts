import type { Transaction } from 'sequelize';

const InventoryService = require('./inventoryService');
const WarehouseStockService = require('./warehouseStockService');
const QuarantineBalanceService = require('./quarantineBalanceService');
const { BusinessRuleError, ValidationError } = require('../errors');

interface ManualStockAdjustmentInput {
  productId: number | string;
  type: 'in' | 'out';
  quantity: number;
  userId: number;
  reason: string;
  transaction: Transaction;
  warehouseCode?: string;
  itemId?: string | null;
}

function normalizeWarehouseCode(warehouseCode?: string): string {
  const normalized = String(warehouseCode ?? '').trim();
  if (!normalized) {
    throw new ValidationError('Deposito da movimentacao e obrigatorio.');
  }
  return normalized;
}

async function assertNoWithheldBalance(productId: number | string, transaction: Transaction) {
  const withheldByProduct = await QuarantineBalanceService.sumWithheldByProduct([Number(productId)], transaction);
  const withheld = Number(withheldByProduct.get(Number(productId)) ?? 0);
  if (withheld > 0) {
    throw new BusinessRuleError(
      'Saida sem lote bloqueada: o produto possui saldo em quarentena/bloqueado. Use um fluxo com lote liberado pela Qualidade.',
      { product_id: Number(productId), withheld_quantity: withheld }
    );
  }
}

async function adjustWithWarehouse(input: ManualStockAdjustmentInput) {
  const warehouseCode = normalizeWarehouseCode(input.warehouseCode);
  const warehouse = await WarehouseStockService.getWarehouseByCode(warehouseCode, input.transaction);
  const productId = Number(input.productId);

  if (input.type === 'out') {
    await assertNoWithheldBalance(productId, input.transaction);
    await WarehouseStockService.removeFromWarehouse(productId, warehouse.id, input.quantity, input.transaction);
  }

  const result = await InventoryService.adjust(
    input.productId,
    input.type,
    input.quantity,
    input.userId,
    input.reason,
    input.transaction,
    warehouse.id,
    input.itemId ?? null
  );

  if (input.type === 'in') {
    await WarehouseStockService.addToWarehouse(productId, warehouse.id, input.quantity, input.transaction);
  }

  return result;
}

module.exports = { adjustWithWarehouse };
