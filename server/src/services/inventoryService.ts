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
 * ## Reserva de venda (gap G9, 2026-08-10)
 *
 * A partir do G9 a reserva deixou de ser exclusiva de ordem de produção: a
 * confirmação de um pedido de venda passou a **reservar** o produto acabado
 * (a baixa efetiva só ocorre na autorização da NF-e — ver
 * `services/saleStockService.ts`). O dono da reserva virou "exatamente um
 * entre OP e venda": `options.productionOrderId` **ou** `options.saleId`,
 * nunca os dois nem nenhum. A mesma tabela guarda os dois casos, com CHECK
 * de exatamente-um-dono no banco (migration
 * `20260810-000030-generalize-stock-reservations-for-sales-g9.cjs`).
 *
 * ## Reserva NÃO gera InventoryMovement (correção de dado, G9)
 *
 * Até 2026-08-09 `reserve`/`releaseReservation` gravavam uma linha em
 * `inventory_movements` com `reference_type` `'reservation'` /
 * `'reservation_release'`. Esses dois valores **não existem** no ENUM
 * `enum_inventory_movements_reference_type` do PostgreSQL — toda reserva
 * real morria em 500 (`invalid input value for enum`). O erro passava por
 * `tsc` e pela suíte inteira porque o campo é tipado como `string` e os
 * testes usam dublês em memória.
 *
 * A correção não foi "adicionar os valores ao ENUM", e sim **parar de
 * gravar o movimento**: `inventory_movements` documenta alteração de
 * `products.quantity` (ver JSDoc de `models/InventoryMovement.ts`), e uma
 * reserva não altera quantidade nenhuma — gravar 'adjustment' de N unidades
 * que não se moveram é o mesmo tipo de dado factualmente errado que a
 * migration `20260809-000027` foi criada para corrigir. O rastro da reserva
 * é a própria linha de `production_order_reservations` (dono, `created_by`,
 * `created_at`, `released_at`, `notes`).
 *
 * @module services/inventoryService
 */

import { Transaction } from 'sequelize';
import { ValidationError } from '../errors';

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
 * Opções das operações de reserva. Desde o gap G3 (2026-08-09) não existe
 * mais reserva anônima — toda reserva tem um dono, e só ele pode liberá-la.
 * Desde o G9 (2026-08-10) o dono pode ser uma OP **ou** uma venda, sempre
 * exatamente um dos dois.
 */
export interface ReservationOptions {
  /** OP dona da reserva (exclusiva com `saleId`). */
  productionOrderId?: number;
  /** Venda dona da reserva (exclusiva com `productionOrderId`) — gap G9. */
  saleId?: number;
  description?: string;
  referenceId?: number;
  referenceType?: string;
}

/**
 * Identificação do dono de uma reserva já normalizada e validada
 * (exatamente um dos dois campos preenchido).
 */
export interface ReservationOwner {
  production_order_id: number | null;
  sale_id: number | null;
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
    operationId?: string | null;
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
      operation_id: data.operationId ?? null,
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
  itemId?: string | null,
  operationId?: string | null
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
      itemId,
      operationId
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
 * Normaliza um id numérico positivo vindo das opções; devolve `null` quando
 * ausente/inválido.
 *
 * @param value - Valor cru recebido nas opções.
 * @returns Id positivo ou `null`.
 */
function normalizePositiveId(value: unknown): number | null {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * Extrai e valida o dono da operação de reserva: exatamente um entre ordem
 * de produção (`productionOrderId`) e venda (`saleId`).
 *
 * @param options - Opções recebidas pela operação de reserva.
 * @returns Dono normalizado (`{ production_order_id, sale_id }`, um deles `null`).
 * @throws {ValidationError} 400 (`details.rule`) se nenhum dono for informado
 *   (`reservation_requires_owner`) ou se os dois forem
 *   (`reservation_requires_exactly_one_owner`).
 */
function requireReservationOwner(options: Partial<ReservationOptions> = {}): ReservationOwner {
  const productionOrderId = normalizePositiveId(options?.productionOrderId);
  const saleId = normalizePositiveId(options?.saleId);

  if (productionOrderId && saleId) {
    throw new ValidationError(
      'Reserva de estoque nao pode ter dois donos: informe options.productionOrderId OU options.saleId, nunca os dois. ' +
      'O banco tambem recusa (CHECK chk_stock_reservations_exactly_one_owner).',
      {
        rule: 'reservation_requires_exactly_one_owner',
        production_order_id: productionOrderId,
        sale_id: saleId,
      }
    );
  }

  if (!productionOrderId && !saleId) {
    throw new ValidationError(
      'Reserva de estoque exige o dono (options.productionOrderId para ordem de producao ou options.saleId para venda). ' +
      'Reserva anonima foi eliminada no gap G3 (2026-08-09): sem dono nao ha como impedir ' +
      'que outro documento libere e consuma este material.',
      { rule: 'reservation_requires_owner' }
    );
  }

  return { production_order_id: productionOrderId, sale_id: saleId };
}

/**
 * Monta o `where` que identifica a reserva viva de um dono.
 *
 * Filtra apenas pela coluna do dono presente (nunca por `IS NULL` da outra):
 * o CHECK de exatamente-um-dono no banco já garante que as duas colunas
 * nunca estão preenchidas ao mesmo tempo, então uma única igualdade é
 * suficiente e não ambígua.
 *
 * @param owner - Dono normalizado.
 * @param productId - Produto reservado.
 * @returns Cláusula `where` da reserva ativa daquele dono/produto.
 */
function ownerWhere(owner: ReservationOwner, productId?: number): Record<string, unknown> {
  const where: Record<string, unknown> = owner.production_order_id
    ? { production_order_id: owner.production_order_id }
    : { sale_id: owner.sale_id };

  if (productId !== undefined) where.product_id = productId;
  where.status = 'active';
  return where;
}

/**
 * Rótulo humano do dono da reserva, usado nas descrições/notes.
 *
 * @param owner - Dono normalizado.
 * @returns Ex.: `OP #12` ou `Venda #34`.
 */
function ownerLabel(owner: ReservationOwner): string {
  return owner.production_order_id ? `OP #${owner.production_order_id}` : `Venda #${owner.sale_id}`;
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
 * Reserva estoque de um produto **para um dono específico** (ordem de
 * produção ou venda).
 *
 * Cria (ou reforça) a linha em `production_order_reservations` daquele dono
 * e recalcula o cache `products.reserved_quantity` na mesma transação. A
 * disponibilidade continua sendo validada contra
 * `quantity - reserved_quantity`, então um documento não consegue reservar
 * material já reservado por outro.
 *
 * Não gera `InventoryMovement`: reserva não altera `products.quantity` (ver
 * JSDoc do módulo).
 *
 * @param productId - ID do produto a reservar.
 * @param quantity - Quantidade a reservar (> 0).
 * @param userId - ID do usuário responsável (vem do JWT, nunca do body).
 * @param transaction - Transação Sequelize ativa.
 * @param options - Opções; exatamente um entre `productionOrderId` e `saleId`.
 * @returns Resultado com o total reservado do produto antes/depois.
 * @throws {ValidationError} 400 sem dono/com dois donos (`details.rule`) ou quantidade inválida (`reservation_quantity_must_be_positive`).
 * @throws {Error} 404 produto inexistente; 422 estoque insuficiente.
 */
async function reserveStock(
  productId: number,
  quantity: number,
  userId: number,
  transaction: Transaction,
  options: Partial<ReservationOptions> = {}
): Promise<InventoryResult> {
  const owner = requireReservationOwner(options);
  const quantityToReserve = Number(quantity);
  if (!Number.isFinite(quantityToReserve) || quantityToReserve <= 0) {
    throw new ValidationError('Quantidade de reserva deve ser maior que zero', {
      rule: 'reservation_quantity_must_be_positive',
      requested_quantity: quantity,
    });
  }

  const product = await validateAndLock(productId, quantityToReserve, transaction);
  const reservedBefore = Number(product.reserved_quantity || 0);

  const existing = await ProductionOrderReservation.findOne({
    where: ownerWhere(owner, productId),
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  if (existing) {
    // Mesmo dono reservando o mesmo produto de novo (ex.: componente repetido
    // em explosoes distintas): reforca a reserva existente em vez de criar
    // uma segunda linha viva — o indice unico parcial do banco tambem impede.
    await existing.update(
      { quantity: Number(existing.quantity) + quantityToReserve },
      { transaction }
    );
  } else {
    await ProductionOrderReservation.create(
      {
        production_order_id: owner.production_order_id,
        sale_id: owner.sale_id,
        product_id: productId,
        quantity: quantityToReserve,
        quantity_released: 0,
        status: 'active',
        created_by: userId ?? null,
        notes: options.description ?? `Reserva de ${ownerLabel(owner)}`
      },
      { transaction }
    );
  }

  const reservedAfter = await recalculateReservedCache(productId, transaction);
  await product.reload({ transaction });

  return {
    success: true,
    productId,
    productName: product.name,
    quantityBefore: reservedBefore,
    quantityAfter: reservedAfter,
    quantityAffected: quantityToReserve,
    product
  };
}

/**
 * Libera reserva de estoque **do dono informado, e somente dele**.
 *
 * A quantidade efetivamente liberada é limitada ao saldo vivo da reserva
 * daquele dono (`quantity - quantity_released`). Se o dono não tiver reserva
 * daquele produto, a operação é um no-op — nunca "empresta" saldo reservado
 * por outro documento (essa era exatamente a canibalização do gap G3).
 *
 * O no-op silencioso (em vez de erro) é deliberado: OPs liberadas **antes**
 * da migration do G3 não têm linha de reserva, e concluí-las/cancelá-las
 * precisa continuar funcionando (ver script de backfill
 * `05_production_order_reservations.ts`). O mesmo vale para vendas
 * confirmadas antes da migration do G9.
 *
 * Não gera `InventoryMovement`: liberar reserva não altera
 * `products.quantity` (ver JSDoc do módulo).
 *
 * @param productId - ID do produto.
 * @param quantity - Quantidade desejada de liberação.
 * @param userId - ID do usuário responsável (do JWT).
 * @param transaction - Transação Sequelize ativa.
 * @param options - Opções; exatamente um entre `productionOrderId` e `saleId`.
 * @returns Resultado com o total reservado do produto antes/depois e o quanto foi liberado.
 * @throws {ValidationError} 400 (`details.rule`) se o dono não for informado ou vierem os dois.
 * @throws {Error} 404 se o produto não existir.
 */
async function releaseStockReservation(
  productId: number,
  quantity: number,
  userId: number,
  transaction: Transaction,
  options: Partial<ReservationOptions> = {}
): Promise<InventoryResult> {
  const owner = requireReservationOwner(options);
  const product = await validateAndLock(productId, undefined, transaction);
  const reservedBefore = Number(product.reserved_quantity || 0);

  const reservation = await ProductionOrderReservation.findOne({
    where: ownerWhere(owner, productId),
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

  return {
    success: true,
    productId,
    productName: product.name,
    quantityBefore: reservedBefore,
    quantityAfter: reservedAfter,
    quantityAffected: quantityToRelease,
    product
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
async function releaseAllReservationsForOwner(
  owner: ReservationOwner,
  userId: number,
  transaction: Transaction,
  options: { description?: string; referenceId?: number; referenceType?: string } = {}
): Promise<InventoryResult[]> {
  const reservations = await ProductionOrderReservation.findAll({
    where: ownerWhere(owner),
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
        productionOrderId: owner.production_order_id ?? undefined,
        saleId: owner.sale_id ?? undefined
      })
    );
  }

  return results;
}

/**
 * Libera **todo** o saldo reservado por uma ordem de produção.
 *
 * @param productionOrderId - ID da OP dona das reservas.
 * @param userId - ID do usuário responsável (do JWT).
 * @param transaction - Transação Sequelize ativa.
 * @param options - Descrição/referência da operação.
 * @returns Lista de resultados, um por produto liberado.
 */
async function releaseAllReservationsForOrder(
  productionOrderId: number,
  userId: number,
  transaction: Transaction,
  options: { description?: string; referenceId?: number; referenceType?: string } = {}
): Promise<InventoryResult[]> {
  return releaseAllReservationsForOwner(
    requireReservationOwner({ productionOrderId }),
    userId,
    transaction,
    options
  );
}

/**
 * Libera **todo** o saldo reservado por uma venda (gap G9, 2026-08-10).
 *
 * Usado no cancelamento da venda: o que ainda não foi faturado volta a ficar
 * disponível para outros pedidos. O que já foi faturado não está mais
 * reservado (virou baixa de estoque na autorização da NF-e) e é tratado
 * separadamente por `ChangeSaleStatusUseCase`.
 *
 * @param saleId - ID da venda dona das reservas.
 * @param userId - ID do usuário responsável (do JWT).
 * @param transaction - Transação Sequelize ativa.
 * @param options - Descrição/referência da operação.
 * @returns Lista de resultados, um por produto liberado.
 */
async function releaseAllReservationsForSale(
  saleId: number,
  userId: number,
  transaction: Transaction,
  options: { description?: string; referenceId?: number; referenceType?: string } = {}
): Promise<InventoryResult[]> {
  return releaseAllReservationsForOwner(
    requireReservationOwner({ saleId }),
    userId,
    transaction,
    options
  );
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

/**
 * Lista as reservas vivas de uma venda (gap G9, 2026-08-10).
 *
 * @param saleId - ID da venda.
 * @param transaction - Transação Sequelize ativa (opcional).
 * @returns Reservas `active` da venda, ordenadas por produto.
 */
async function listSaleReservations(
  saleId: number,
  transaction?: Transaction
): Promise<any[]> {
  return ProductionOrderReservation.findAll({
    where: { sale_id: saleId, status: 'active' },
    order: [['product_id', 'ASC']],
    transaction
  });
}

export {
  reserveStock as reserve,
  releaseStockReservation as releaseReservation,
  releaseAllReservationsForOrder,
  releaseAllReservationsForSale,
  listOrderReservations,
  listSaleReservations
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
  releaseAllReservationsForSale,
  listOrderReservations,
  listSaleReservations,
  recalculateReservedCache
};
