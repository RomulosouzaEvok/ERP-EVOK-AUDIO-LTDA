/**
 * 🏭 WarehouseStockService — Serviço de domínio para saldo por depósito.
 *
 * Complementa `inventoryService.ts` (que continua sendo a fonte de
 * verdade de `products.quantity`, usada por MRP e telas legadas) com o
 * dual-write obrigatório em `ProductWarehouseStock` (Bloco 4,
 * docs/governance/TODO.md; docs/business/BUSINESS_RULES.md §12).
 *
 * INVARIANTE (BUSINESS_RULES.md §12 item 3, obrigatória e testável):
 *   saldo_total(produto) = SOMA(quantity) de ProductWarehouseStock do
 *   produto, para todo depósito ativo.
 * Toda rotina que altera `products.quantity` via `inventoryService` DEVE
 * também chamar `addToWarehouse`/`removeFromWarehouse` na MESMA
 * transação, para o depósito correto (ver tabela de roteamento em
 * BUSINESS_RULES.md §12 item 7). Transferências entre depósitos NUNCA
 * alteram `products.quantity` — apenas debitam origem e creditam destino
 * dentro desta mesma tabela (§12 item 4).
 *
 * @module services/warehouseStockService
 */

import { Transaction } from 'sequelize';
import { BusinessRuleError, NotFoundError } from '../errors';

// Modelos carregados via CommonJS (hybrid mode, mesmo padrão de inventoryService.ts)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Product, Warehouse, ProductWarehouseStock } = require('../models/index');

/**
 * Resultado de uma operação de saldo por depósito.
 */
export interface WarehouseStockResult {
  productId: number;
  warehouseId: number;
  quantityBefore: number;
  quantityAfter: number;
  stock: any;
}

/**
 * Busca (e trava) a linha de saldo `ProductWarehouseStock` de um par
 * produto/depósito, criando-a com saldo zero se ainda não existir.
 *
 * @param productId - ID do produto.
 * @param warehouseId - ID do depósito.
 * @param transaction - Transação Sequelize ativa.
 * @returns Instância travada (`LOCK.UPDATE`) do saldo do par produto/depósito.
 */
async function findOrCreateLocked(productId: number, warehouseId: number, transaction: Transaction): Promise<any> {
  let stock = await ProductWarehouseStock.findOne({
    where: { product_id: productId, warehouse_id: warehouseId },
    transaction,
    lock: Transaction.LOCK.UPDATE,
  });

  if (!stock) {
    stock = await ProductWarehouseStock.create(
      { product_id: productId, warehouse_id: warehouseId, quantity: 0 },
      { transaction }
    );
    // Recarrega com lock para manter o mesmo comportamento de concorrência
    // do caminho "já existia" (evita uma linha sem lock explícito na mesma tx).
    stock = await ProductWarehouseStock.findOne({
      where: { product_id: productId, warehouse_id: warehouseId },
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
  }

  return stock;
}

/**
 * Resolve um depósito pelo `code` único (ex.: `INSUMOS`, `ACABADOS`,
 * `LABORATORIO`).
 *
 * @param code - Código do depósito.
 * @param transaction - Transação Sequelize ativa (opcional — leitura pode
 *   ocorrer fora de transação quando usada apenas para resolver um id).
 * @returns Instância do depósito.
 * @throws {NotFoundError} Se o código não corresponder a nenhum depósito
 *   ativo.
 */
export async function getWarehouseByCode(code: string, transaction?: Transaction): Promise<any> {
  const warehouse = await Warehouse.findOne({
    where: { code: String(code).trim().toUpperCase(), active: true },
    transaction,
  });

  if (!warehouse) {
    throw new NotFoundError(`Depósito "${code}" não encontrado ou inativo.`);
  }

  return warehouse;
}

/**
 * Credita saldo de um produto em um depósito (dual-write).
 *
 * Operação atômica com lock pessimista sobre a linha `(product_id,
 * warehouse_id)`. Não altera `products.quantity` — a chamada a
 * `inventoryService.receive`/`adjust` é responsabilidade do caller, na
 * MESMA transação, para preservar a invariante de soma (§12 item 3).
 *
 * @param productId - ID do produto.
 * @param warehouseId - ID do depósito.
 * @param quantity - Quantidade a creditar (deve ser > 0).
 * @param transaction - Transação Sequelize ativa.
 * @returns Resultado da operação (saldo antes/depois no depósito).
 */
export async function addToWarehouse(
  productId: number,
  warehouseId: number,
  quantity: number,
  transaction: Transaction
): Promise<WarehouseStockResult> {
  const stock = await findOrCreateLocked(productId, warehouseId, transaction);
  const quantityBefore = Number(stock.quantity);

  await stock.increment('quantity', { by: quantity, transaction });
  await stock.reload({ transaction });

  return {
    productId,
    warehouseId,
    quantityBefore,
    quantityAfter: quantityBefore + Number(quantity),
    stock,
  };
}

/**
 * Debita saldo de um produto em um depósito (dual-write).
 *
 * Operação atômica com lock pessimista. Bloqueia com erro 422 didático
 * (nunca deixa o saldo do depósito ficar negativo) se o saldo disponível
 * no depósito for insuficiente — cita produto, depósito e saldo atual,
 * conforme padrão de alerta didático (`BUSINESS_RULES.md` §13).
 *
 * @param productId - ID do produto.
 * @param warehouseId - ID do depósito.
 * @param quantity - Quantidade a debitar (deve ser > 0).
 * @param transaction - Transação Sequelize ativa.
 * @returns Resultado da operação (saldo antes/depois no depósito).
 * @throws {BusinessRuleError} Se o saldo do depósito for insuficiente.
 */
export async function removeFromWarehouse(
  productId: number,
  warehouseId: number,
  quantity: number,
  transaction: Transaction
): Promise<WarehouseStockResult> {
  const stock = await findOrCreateLocked(productId, warehouseId, transaction);
  const quantityBefore = Number(stock.quantity);

  if (quantityBefore < Number(quantity)) {
    const product = await Product.findByPk(productId, { transaction });
    const warehouse = await Warehouse.findByPk(warehouseId, { transaction });
    const productLabel = product ? `"${product.name}" (#${productId})` : `#${productId}`;
    const warehouseLabel = warehouse ? `"${warehouse.name}" (${warehouse.code})` : `#${warehouseId}`;
    throw new BusinessRuleError(
      `Saldo insuficiente do produto ${productLabel} no depósito ${warehouseLabel}. ` +
      `Saldo atual: ${quantityBefore}, solicitado: ${quantity}.`,
      {
        product_id: productId,
        product_name: product?.name ?? null,
        warehouse_id: warehouseId,
        warehouse_code: warehouse?.code ?? null,
        available_quantity: quantityBefore,
        requested_quantity: Number(quantity),
      }
    );
  }

  await stock.decrement('quantity', { by: quantity, transaction });
  await stock.reload({ transaction });

  return {
    productId,
    warehouseId,
    quantityBefore,
    quantityAfter: quantityBefore - Number(quantity),
    stock,
  };
}

module.exports = { addToWarehouse, removeFromWarehouse, getWarehouseByCode };
