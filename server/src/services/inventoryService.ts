/**
 * 📦 InventoryService — Serviço de domínio para operações de estoque.
 *
 * Centraliza todas as operações atômicas de estoque (reservar, consumir,
 * receber, ajustar) com lock pessimista e transação para garantir
 * consistência mesmo sob concorrência.
 *
 * NENHUM controller deve alterar `Product.quantity` diretamente.
 * Toda movimentação passa por este serviço e gera registro em
 * `InventoryMovement`.
 *
 * @module services/inventoryService
 */

import { Transaction } from 'sequelize';

// Modelos carregados via CommonJS (hybrid mode)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Product, InventoryMovement } = require('../models/index');

/**
 * Resultado de uma operação de estoque.
 */
export interface InventoryResult {
  success: boolean;
  productId: number;
  productName: string;
  quantityBefore: number;
  quantityAfter: number;
  movementId?: number;
  error?: string;
}

/**
 * Valida se o produto existe e retorna seus dados (com lock pessimista).
 *
 * @param productId - ID do produto.
 * @param quantity - Quantidade a validar (opcional).
 * @param transaction - Transação Sequelize ativa.
 * @returns Instância do produto (model Sequelize).
 * @throws {Error} Se produto não existir ou quantidade for insuficiente.
 */
async function validateAndLock(
  productId: number,
  quantity: number | undefined,
  transaction: Transaction
): Promise<any> {
  const product = await Product.findByPk(productId, {
    transaction,
    lock: Transaction.LOCK.UPDATE
  });

  if (!product) {
    throw Object.assign(new Error(`Produto ID ${productId} não encontrado`), {
      statusCode: 404
    });
  }

  const reserved = Number(product.reserved_quantity || 0);
  const available = Number(product.quantity || 0) - reserved;

  if (quantity !== undefined && available < quantity) {
    throw Object.assign(
      new Error(
        `Estoque insuficiente para "${product.name}". ` +
        `Disponível: ${product.quantity}, Solicitado: ${quantity}`
      ),
      { statusCode: 422 }
    );
  }

  return product;
}

/**
 * Cria um registro de movimentação de estoque.
 *
 * @param data - Dados da movimentação.
 * @param transaction - Transação Sequelize ativa.
 * @returns Registro de InventoryMovement criado.
 */
async function createMovement(
  data: {
    productId: number;
    userId: number;
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    description?: string;
    referenceId?: number;
    referenceType?: string;
  },
  transaction: Transaction
) {
  return InventoryMovement.create(
    {
      product_id: data.productId,
      user_id: data.userId,
      type: data.type,
      quantity: data.quantity,
      description: data.description ?? '',
      reference_id: data.referenceId ?? null,
      reference_type: data.referenceType ?? null
    },
    { transaction }
  );
}

/**
 * Consome (baixa) estoque de um produto.
 *
 * Operação atômica com lock pessimista. Gera movimentação do tipo 'out'.
 *
 * @param productId - ID do produto.
 * @param quantity - Quantidade a consumir.
 * @param userId - ID do usuário responsável.
 * @param transaction - Transação Sequelize ativa.
 * @param options - Opções adicionais (description, referenceId, referenceType).
 * @returns Resultado da operação.
 * @throws {Error} Se produto não existir ou estoque insuficiente.
 */
export async function consume(
  productId: number,
  quantity: number,
  userId: number,
  transaction: Transaction,
  options: {
    description?: string;
    referenceId?: number;
    referenceType?: string;
  } = {}
): Promise<InventoryResult> {
  const product = await validateAndLock(productId, quantity, transaction);
  const qtyBefore = product.quantity;

  await product.decrement('quantity', { by: quantity, transaction });

  const movement = await createMovement(
    {
      productId,
      userId,
      type: 'out',
      quantity,
      description: options.description ?? 'Consumo de estoque',
      referenceId: options.referenceId,
      referenceType: options.referenceType
    },
    transaction
  );

  const qtyAfter = qtyBefore - quantity;

  return {
    success: true,
    productId,
    productName: product.name,
    quantityBefore: qtyBefore,
    quantityAfter: qtyAfter,
    movementId: movement.id
  };
}

/**
 * Recebe (entrada) estoque de um produto.
 *
 * Operação atômica com lock pessimista. Gera movimentação do tipo 'in'.
 *
 * @param productId - ID do produto.
 * @param quantity - Quantidade a receber.
 * @param userId - ID do usuário responsável.
 * @param transaction - Transação Sequelize ativa.
 * @param options - Opções adicionais.
 * @returns Resultado da operação.
 * @throws {Error} Se produto não existir.
 */
export async function receive(
  productId: number,
  quantity: number,
  userId: number,
  transaction: Transaction,
  options: {
    description?: string;
    referenceId?: number;
    referenceType?: string;
  } = {}
): Promise<InventoryResult> {
  const product = await validateAndLock(productId, undefined, transaction);
  const qtyBefore = product.quantity;

  await product.increment('quantity', { by: quantity, transaction });

  const movement = await createMovement(
    {
      productId,
      userId,
      type: 'in',
      quantity,
      description: options.description ?? 'Entrada de estoque',
      referenceId: options.referenceId,
      referenceType: options.referenceType
    },
    transaction
  );

  const qtyAfter = qtyBefore + quantity;

  return {
    success: true,
    productId,
    productName: product.name,
    quantityBefore: qtyBefore,
    quantityAfter: qtyAfter,
    movementId: movement.id
  };
}

/**
 * Ajusta estoque manualmente (entrada ou saída).
 *
 * Operação atômica com lock pessimista. Gera movimentação do tipo
 * 'adjustment'. Requer descrição (motivo) obrigatória.
 *
 * @param productId - ID do produto.
 * @param type - Tipo de ajuste ('in' ou 'out').
 * @param quantity - Quantidade a ajustar.
 * @param userId - ID do usuário responsável.
 * @param reason - Motivo do ajuste (obrigatório).
 * @param transaction - Transação Sequelize ativa.
 * @returns Resultado da operação.
 * @throws {Error} Se produto não existir, estoque insuficiente ou reason vazio.
 */
export async function adjust(
  productId: number,
  type: 'in' | 'out',
  quantity: number,
  userId: number,
  reason: string,
  transaction: Transaction
): Promise<InventoryResult> {
  if (!reason || reason.trim().length === 0) {
    throw Object.assign(new Error('Motivo do ajuste é obrigatório'), {
      statusCode: 400
    });
  }

  const product = await validateAndLock(
    productId,
    type === 'out' ? quantity : undefined,
    transaction
  );
  const qtyBefore = product.quantity;

  if (type === 'in') {
    await product.increment('quantity', { by: quantity, transaction });
  } else {
    await product.decrement('quantity', { by: quantity, transaction });
  }

  const movement = await createMovement(
    {
      productId,
      userId,
      type: 'adjustment',
      quantity,
      description: reason,
      referenceType: 'adjustment'
    },
    transaction
  );

  const qtyAfter = type === 'in' ? qtyBefore + quantity : qtyBefore - quantity;

  return {
    success: true,
    productId,
    productName: product.name,
    quantityBefore: qtyBefore,
    quantityAfter: qtyAfter,
    movementId: movement.id
  };
}

/**
 * Reserva estoque (stub defensivo).
 *
 * A coluna `reserved_quantity` ainda não existe no schema Product.
 * Este método é um no-op documentado que sempre retorna sucesso,
 * mas registra a movimentação para rastreabilidade.
 *
 * @deprecated A reserva real depende da migration da coluna `reserved_quantity`.
 */
async function previousReserve(
  productId: number,
  quantity: number,
  userId: number,
  transaction: Transaction,
  options: { description?: string; referenceId?: number; referenceType?: string } = {}
): Promise<InventoryResult> {
  // Stub defensivo: não altera estoque, apenas registra
  const product = await validateAndLock(productId, undefined, transaction);

  const movement = await createMovement(
    {
      productId,
      userId,
      type: 'adjustment',
      quantity,
      description: options.description ?? 'Reserva de estoque anterior',
      referenceId: options.referenceId,
      referenceType: options.referenceType ?? 'reservation'
    },
    transaction
  );

  return {
    success: true,
    productId,
    productName: product.name,
    quantityBefore: product.quantity,
    quantityAfter: product.quantity,
    movementId: movement.id
  };
}

/**
 * Libera reserva de estoque (stub defensivo).
 *
 * @deprecated A reserva real depende da migration da coluna `reserved_quantity`.
 */
async function previousReleaseReservation(
  productId: number,
  quantity: number,
  userId: number,
  transaction: Transaction,
  options: { description?: string; referenceId?: number; referenceType?: string } = {}
): Promise<InventoryResult> {
  const product = await validateAndLock(productId, undefined, transaction);

  const movement = await createMovement(
    {
      productId,
      userId,
      type: 'adjustment',
      quantity,
      description: options.description ?? 'Liberacao de reserva anterior',
      referenceId: options.referenceId,
      referenceType: options.referenceType ?? 'reservation_release'
    },
    transaction
  );

  return {
    success: true,
    productId,
    productName: product.name,
    quantityBefore: product.quantity,
    quantityAfter: product.quantity,
    movementId: movement.id
  };
}

async function reserveStock(
  productId: number,
  quantity: number,
  userId: number,
  transaction: Transaction,
  options: { description?: string; referenceId?: number; referenceType?: string } = {}
): Promise<InventoryResult> {
  const product = await validateAndLock(productId, quantity, transaction);
  const reservedBefore = Number(product.reserved_quantity || 0);
  await product.increment('reserved_quantity', { by: quantity, transaction });
  await product.reload({ transaction });

  const movement = await createMovement(
    {
      productId,
      userId,
      type: 'adjustment',
      quantity,
      description: options.description ?? 'Reserva de estoque',
      referenceId: options.referenceId,
      referenceType: options.referenceType ?? 'reservation'
    },
    transaction
  );

  return {
    success: true,
    productId,
    productName: product.name,
    quantityBefore: reservedBefore,
    quantityAfter: reservedBefore + quantity,
    movementId: movement.id
  };
}

async function releaseStockReservation(
  productId: number,
  quantity: number,
  userId: number,
  transaction: Transaction,
  options: { description?: string; referenceId?: number; referenceType?: string } = {}
): Promise<InventoryResult> {
  const product = await validateAndLock(productId, undefined, transaction);
  const reservedBefore = Number(product.reserved_quantity || 0);
  if (reservedBefore < quantity) {
    throw Object.assign(new Error(`Reserva insuficiente. Reservado: ${reservedBefore}, solicitado: ${quantity}`), {
      statusCode: 400
    });
  }
  await product.decrement('reserved_quantity', { by: quantity, transaction });
  await product.reload({ transaction });

  const movement = await createMovement(
    {
      productId,
      userId,
      type: 'adjustment',
      quantity,
      description: options.description ?? 'Liberacao de reserva de estoque',
      referenceId: options.referenceId,
      referenceType: options.referenceType ?? 'reservation_release'
    },
    transaction
  );

  return {
    success: true,
    productId,
    productName: product.name,
    quantityBefore: reservedBefore,
    quantityAfter: reservedBefore - quantity,
    movementId: movement.id
  };
}

export { reserveStock as reserve, releaseStockReservation as releaseReservation };

// CommonJS compatibility for previous JS modules
module.exports = { consume, receive, adjust, reserve: reserveStock, releaseReservation: releaseStockReservation };
