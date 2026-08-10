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
 * ## Reserva de material (gap G3, 2026-08-09)
 *
 * A fonte da verdade da reserva é a tabela `production_order_reservations`
 * (OP × produto × quantidade). `products.reserved_quantity` continua sendo
 * mantido, porém como **cache derivado** — recalculado como
 * `SUM(quantity - quantity_released)` das reservas ativas do produto, dentro
 * da mesma transação, para não quebrar os leitores existentes
 * (`validateAndLock` aqui, dual-read de `Item.estoque_reservado`, MRP e as
 * telas do `client/`). Nenhum código deve escrever nesse campo diretamente.
 *
 * Consequência prática: `reserve`/`releaseReservation` exigem a OP dona
 * (`options.productionOrderId`) e a liberação é limitada ao saldo daquela
 * ordem — uma OP não consegue mais liberar/consumir material reservado por
 * outra.
 *
 * @module services/inventoryService
 */

import { Transaction } from 'sequelize';

// Modelos carregados via CommonJS (hybrid mode)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Product, InventoryMovement, ProductionOrderReservation } = require('../models/index');

/**
 * Tolerância para comparação de quantidades decimais (DECIMAL(18,6)).
 * Abaixo disso, uma diferença é ruído de ponto flutuante, não saldo real.
 */
const RESERVATION_EPSILON = 0.0000005;

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
  product?: any;
  error?: string;
  /** Quantidade efetivamente reservada/liberada nesta chamada (operações de reserva). */
  quantityAffected?: number;
}

/**
 * Opções das operações de reserva. `productionOrderId` é **obrigatório**:
 * desde o gap G3 (2026-08-09) não existe mais reserva anônima — toda reserva
 * tem uma ordem dona, e só ela pode liberá-la.
 */
export interface ReservationOptions {
  /** OP dona da reserva (obrigatória). */
  productionOrderId: number;
  description?: string;
  referenceId?: number;
  referenceType?: string;
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
    type: 'in' | 'out' | 'adjustment' | 'transfer';
    quantity: number;
    description?: string;
    referenceId?: number;
    referenceType?: string;
    warehouseId?: number | null;
    itemId?: string | null;
  },
  transaction: Transaction
) {
  return InventoryMovement.create(
    {
      product_id: data.productId,
      item_id: data.itemId ?? null,
      user_id: data.userId,
      type: data.type,
      quantity: data.quantity,
      description: data.description ?? '',
      reference_id: data.referenceId ?? null,
      reference_type: data.referenceType ?? null,
      warehouse_id: data.warehouseId ?? null
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
    warehouseId?: number | null;
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
      referenceType: options.referenceType,
      warehouseId: options.warehouseId
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
    product,
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
    warehouseId?: number | null;
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
      referenceType: options.referenceType,
      warehouseId: options.warehouseId
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
    product,
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
 * @param warehouseId - Id do depósito onde o ajuste ocorre (opcional).
 * @param itemId - Id (UUID) do `Item` novo de origem, quando a movimentação
 *   foi criada via `item_id` (dual-read, resolvido para `productId` antes de
 *   chamar esta função) — gravado em `InventoryMovement.item_id` apenas para
 *   rastreabilidade; não altera nenhum saldo. `null`/`undefined` para o
 *   fluxo legado por `product_id` (comportamento inalterado).
 * @returns Resultado da operação.
 * @throws {Error} Se produto não existir, estoque insuficiente ou reason vazio.
 */
export async function adjust(
  productId: number,
  type: 'in' | 'out',
  quantity: number,
  userId: number,
  reason: string,
  transaction: Transaction,
  warehouseId?: number | null,
  itemId?: string | null
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
      referenceType: 'adjustment',
      warehouseId,
      itemId
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
    product,
    movementId: movement.id
  };
}

/**
 * Extrai e valida a OP dona da operação de reserva.
 *
 * @param options - Opções recebidas pela operação de reserva.
 * @returns ID da ordem de produção dona.
 * @throws {Error} 400 se a OP dona não for informada.
 */
function requireOwnerOrderId(options: Partial<ReservationOptions>): number {
  const productionOrderId = Number(options?.productionOrderId);
  if (!Number.isFinite(productionOrderId) || productionOrderId <= 0) {
    throw Object.assign(
      new Error(
        'Reserva de estoque exige a ordem de producao dona (options.productionOrderId). ' +
        'Reserva anonima foi eliminada no gap G3 (2026-08-09): sem dono nao ha como impedir ' +
        'que outra ordem libere e consuma este material.'
      ),
      { statusCode: 400 }
    );
  }
  return productionOrderId;
}

/**
 * Recalcula o cache `products.reserved_quantity` a partir da fonte da
 * verdade (`production_order_reservations`).
 *
 * O valor gravado é sempre `SUM(quantity - quantity_released)` das reservas
 * `active` do produto. Isso torna o cache **auto-corrigível**: qualquer
 * divergência herdada some na primeira operação de reserva daquele produto.
 *
 * Requer que a linha do produto já esteja travada (`FOR UPDATE`) pelo
 * chamador — todas as operações de reserva passam por `validateAndLock`
 * antes, o que serializa reservas concorrentes do mesmo produto.
 *
 * A soma é feita em memória (e não com `SUM()` no banco) de propósito: o
 * conjunto é pequeno (uma linha por OP aberta que consome aquele item) e
 * evita depender de expressão SQL literal, que é a classe de erro que só
 * aparece em runtime contra o Postgres real.
 *
 * @param productId - ID do produto.
 * @param transaction - Transação Sequelize ativa.
 * @returns Novo total reservado do produto.
 */
export async function recalculateReservedCache(
  productId: number,
  transaction: Transaction
): Promise<number> {
  const activeReservations = await ProductionOrderReservation.findAll({
    where: { product_id: productId, status: 'active' },
    transaction
  });

  const total = (activeReservations ?? []).reduce(
    (sum: number, row: any) => sum + (Number(row.quantity || 0) - Number(row.quantity_released || 0)),
    0
  );
  const normalized = Number.isFinite(total) && total > RESERVATION_EPSILON ? total : 0;

  await Product.update({ reserved_quantity: normalized }, { where: { id: productId }, transaction });

  return normalized;
}

/**
 * Reserva estoque de um produto **para uma ordem de produção específica**.
 *
 * Cria (ou reforça) a linha em `production_order_reservations` daquela OP e
 * recalcula o cache `products.reserved_quantity` na mesma transação. A
 * disponibilidade continua sendo validada contra
 * `quantity - reserved_quantity`, então uma OP não consegue reservar
 * material já reservado por outra.
 *
 * @param productId - ID do produto a reservar.
 * @param quantity - Quantidade a reservar (> 0).
 * @param userId - ID do usuário responsável (vem do JWT, nunca do body).
 * @param transaction - Transação Sequelize ativa.
 * @param options - Opções; `productionOrderId` é obrigatório.
 * @returns Resultado com o total reservado do produto antes/depois.
 * @throws {Error} 400 sem OP dona ou quantidade inválida; 404 produto inexistente; 422 estoque insuficiente.
 */
async function reserveStock(
  productId: number,
  quantity: number,
  userId: number,
  transaction: Transaction,
  options: Partial<ReservationOptions> = {}
): Promise<InventoryResult> {
  const productionOrderId = requireOwnerOrderId(options);
  const quantityToReserve = Number(quantity);
  if (!Number.isFinite(quantityToReserve) || quantityToReserve <= 0) {
    throw Object.assign(new Error('Quantidade de reserva deve ser maior que zero'), { statusCode: 400 });
  }

  const product = await validateAndLock(productId, quantityToReserve, transaction);
  const reservedBefore = Number(product.reserved_quantity || 0);

  const existing = await ProductionOrderReservation.findOne({
    where: { production_order_id: productionOrderId, product_id: productId, status: 'active' },
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  if (existing) {
    // Mesma OP reservando o mesmo produto de novo (ex.: componente repetido
    // em explosoes distintas): reforca a reserva existente em vez de criar
    // uma segunda linha viva — o indice unico parcial do banco tambem impede.
    await existing.update(
      { quantity: Number(existing.quantity) + quantityToReserve },
      { transaction }
    );
  } else {
    await ProductionOrderReservation.create(
      {
        production_order_id: productionOrderId,
        product_id: productId,
        quantity: quantityToReserve,
        quantity_released: 0,
        status: 'active',
        created_by: userId ?? null,
        notes: options.description ?? null
      },
      { transaction }
    );
  }

  const reservedAfter = await recalculateReservedCache(productId, transaction);
  await product.reload({ transaction });

  const movement = await createMovement(
    {
      productId,
      userId,
      type: 'adjustment',
      quantity: quantityToReserve,
      description: options.description ?? 'Reserva de estoque',
      referenceId: options.referenceId ?? productionOrderId,
      referenceType: options.referenceType ?? 'reservation'
    },
    transaction
  );

  return {
    success: true,
    productId,
    productName: product.name,
    quantityBefore: reservedBefore,
    quantityAfter: reservedAfter,
    quantityAffected: quantityToReserve,
    product,
    movementId: movement.id
  };
}

/**
 * Libera reserva de estoque **da ordem informada, e somente dela**.
 *
 * A quantidade efetivamente liberada é limitada ao saldo vivo da reserva
 * daquela OP (`quantity - quantity_released`). Se a OP não tiver reserva
 * daquele produto, a operação é um no-op — nunca "empresta" saldo reservado
 * por outra ordem (essa era exatamente a canibalização do gap G3).
 *
 * O no-op silencioso (em vez de erro) é deliberado: OPs liberadas **antes**
 * desta migration não têm linha de reserva, e concluí-las/cancelá-las precisa
 * continuar funcionando (ver script de backfill
 * `05_production_order_reservations.ts`).
 *
 * @param productId - ID do produto.
 * @param quantity - Quantidade desejada de liberação.
 * @param userId - ID do usuário responsável (do JWT).
 * @param transaction - Transação Sequelize ativa.
 * @param options - Opções; `productionOrderId` é obrigatório.
 * @returns Resultado com o total reservado do produto antes/depois e o quanto foi liberado.
 * @throws {Error} 400 se a OP dona não for informada; 404 se o produto não existir.
 */
async function releaseStockReservation(
  productId: number,
  quantity: number,
  userId: number,
  transaction: Transaction,
  options: Partial<ReservationOptions> = {}
): Promise<InventoryResult> {
  const productionOrderId = requireOwnerOrderId(options);
  const product = await validateAndLock(productId, undefined, transaction);
  const reservedBefore = Number(product.reserved_quantity || 0);

  const reservation = await ProductionOrderReservation.findOne({
    where: { production_order_id: productionOrderId, product_id: productId, status: 'active' },
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  const reservedTotal = reservation ? Number(reservation.quantity || 0) : 0;
  const releasedSoFar = reservation ? Number(reservation.quantity_released || 0) : 0;
  const outstanding = Math.max(reservedTotal - releasedSoFar, 0);
  const desired = Number(quantity);
  const quantityToRelease = Math.min(outstanding, Number.isFinite(desired) && desired > 0 ? desired : 0);

  if (quantityToRelease <= RESERVATION_EPSILON) {
    return {
      success: true,
      productId,
      productName: product.name,
      quantityBefore: reservedBefore,
      quantityAfter: reservedBefore,
      quantityAffected: 0,
      product
    };
  }

  // Liberação total: grava exatamente `quantity` (e não a soma) para que o
  // CHECK de coerência status × quantity_released nunca falhe por resíduo de
  // ponto flutuante.
  const fullyReleased = quantityToRelease >= outstanding - RESERVATION_EPSILON;
  await reservation.update(
    {
      quantity_released: fullyReleased ? reservedTotal : releasedSoFar + quantityToRelease,
      status: fullyReleased ? 'released' : 'active',
      released_at: fullyReleased ? new Date() : reservation.released_at ?? null
    },
    { transaction }
  );

  const reservedAfter = await recalculateReservedCache(productId, transaction);
  await product.reload({ transaction });

  const movement = await createMovement(
    {
      productId,
      userId,
      type: 'adjustment',
      quantity: quantityToRelease,
      description: options.description ?? 'Liberacao de reserva de estoque',
      referenceId: options.referenceId ?? productionOrderId,
      referenceType: options.referenceType ?? 'reservation_release'
    },
    transaction
  );

  return {
    success: true,
    productId,
    productName: product.name,
    quantityBefore: reservedBefore,
    quantityAfter: reservedAfter,
    quantityAffected: quantityToRelease,
    product,
    movementId: movement.id
  };
}

/**
 * Libera **todo** o saldo reservado por uma ordem de produção.
 *
 * Usado no cancelamento e imediatamente antes do consumo na conclusão da OP.
 * Substitui a antiga rotina que reexplodia a BOM para adivinhar o que
 * liberar — que vazava reserva quando a estrutura mudava entre a liberação e
 * a conclusão, e que (por operar sobre o contador global) liberava material
 * de terceiros.
 *
 * As reservas são percorridas em ordem estável de `product_id`, e cada
 * liberação trava primeiro o produto e depois a reserva — mesma ordem de
 * `reserveStock`, para não criar ciclo de deadlock entre OPs concorrentes.
 *
 * @param productionOrderId - ID da OP dona das reservas.
 * @param userId - ID do usuário responsável (do JWT).
 * @param transaction - Transação Sequelize ativa.
 * @param options - Descrição/referência da movimentação gerada.
 * @returns Lista de resultados, um por produto liberado.
 */
async function releaseAllReservationsForOrder(
  productionOrderId: number,
  userId: number,
  transaction: Transaction,
  options: { description?: string; referenceId?: number; referenceType?: string } = {}
): Promise<InventoryResult[]> {
  const reservations = await ProductionOrderReservation.findAll({
    where: { production_order_id: productionOrderId, status: 'active' },
    order: [['product_id', 'ASC']],
    transaction
  });

  const results: InventoryResult[] = [];
  for (const reservation of reservations) {
    const outstanding = Number(reservation.quantity || 0) - Number(reservation.quantity_released || 0);
    if (outstanding <= RESERVATION_EPSILON) continue;

    results.push(
      await releaseStockReservation(reservation.product_id, outstanding, userId, transaction, {
        ...options,
        productionOrderId
      })
    );
  }

  return results;
}

/**
 * Lista as reservas vivas de uma ordem de produção.
 *
 * Responde à pergunta que o contador global não respondia: "quanto deste
 * item está reservado para a OP X?".
 *
 * @param productionOrderId - ID da OP.
 * @param transaction - Transação Sequelize ativa (opcional).
 * @returns Reservas `active` da OP, ordenadas por produto.
 */
async function listOrderReservations(
  productionOrderId: number,
  transaction?: Transaction
): Promise<any[]> {
  return ProductionOrderReservation.findAll({
    where: { production_order_id: productionOrderId, status: 'active' },
    order: [['product_id', 'ASC']],
    transaction
  });
}

export {
  reserveStock as reserve,
  releaseStockReservation as releaseReservation,
  releaseAllReservationsForOrder,
  listOrderReservations
};

// CommonJS compatibility for previous JS modules.
// ATENÇÃO: este objeto SUBSTITUI os named exports acima em tempo de execução
// (require). Toda função nova precisa aparecer aqui também — há teste
// dedicado (`inventory-service-contract.test.ts`) garantindo isso.
module.exports = {
  consume,
  receive,
  adjust,
  reserve: reserveStock,
  releaseReservation: releaseStockReservation,
  releaseAllReservationsForOrder,
  listOrderReservations,
  recalculateReservedCache
};
