/**
 * 📦 materialReceiptService — caminho ÚNICO de entrada de material comprado
 * no estoque (compra nacional e importação/COMEX).
 *
 * ## Por que este serviço existe (gap G14)
 *
 * Até 2026-08-09 existiam DOIS caminhos de entrada de insumo comprado, com
 * rigor diferente:
 *
 * | Passo                                   | Compra nacional | Importação (COMEX) |
 * |-----------------------------------------|-----------------|--------------------|
 * | `products.quantity` (`InventoryService`) | sim             | sim                |
 * | Dual-write de depósito                   | sim             | **não**            |
 * | Lote (`lot_controls`)                    | sim             | **não**            |
 * | Quarentena (gate de qualidade)           | sim             | **não**            |
 * | Custo médio ponderado                    | sim             | sim                |
 *
 * O efeito prático: material importado entrava em estoque **sem lote**
 * (nenhuma rastreabilidade por lote, exigência de auditoria fiscal e de ISO
 * 9001 8.5.2), **sem depósito** (quebrando a invariante de
 * `BUSINESS_RULES.md §12 item 3`, `products.quantity = SOMA` dos saldos por
 * depósito) e **sem passar pela quarentena** — ou seja, podia ser consumido
 * pela produção sem nenhuma inspeção de recebimento, ao contrário de
 * qualquer material comprado no Brasil.
 *
 * Este módulo extrai o caminho já testado de `ReceivePurchaseItemsUseCase`
 * (que continua sendo o único consumidor do lado de compras) para que a
 * importação **reutilize exatamente a mesma sequência**, em vez de duplicar
 * uma versão degradada dela.
 *
 * ## Sequência executada (na ordem, sempre na MESMA transação)
 *
 * 1. `InventoryService.receive` — incrementa `products.quantity` e grava a
 *    `inventory_movements` (rastro da origem via `reference_type`/`reference_id`);
 * 2. `WarehouseStockService.addToWarehouse` — dual-write do saldo por
 *    depósito (`BUSINESS_RULES.md §12 item 3`);
 * 3. lote em `lot_controls` nascendo **`quarantine`** — o saldo físico entra,
 *    mas o CONSUMO por lote fica bloqueado até a inspeção de recebimento
 *    liberar (`POST /api/inventory/lots/:id/release`). O FEFO da produção só
 *    seleciona lote `available`, então a quarentena já basta para manter o
 *    material fora do consumo automático;
 * 4. `CostingService.registerWeightedAverageCost` — custo real médio
 *    ponderado do produto.
 *
 * ## Acesso ao lote via gateway (e não via model direto)
 *
 * O lote é lido/gravado por um `lotGateway` injetado (`findLotForReceipt` /
 * `createLot`) em vez de `LotControl` direto. Motivo: os dois consumidores já
 * são módulos Clean Architecture com repositório próprio (`PurchaseRepository`
 * e `ComexRepository`), e ambos satisfazem esse contrato estruturalmente —
 * assim o serviço continua testável com repositório mockado, sem abrir uma
 * segunda porta de acesso ao ORM.
 *
 * @module services/materialReceiptService
 */

import type { Transaction } from 'sequelize';

// Modelos/serviços carregados via CommonJS (hybrid mode, mesmo padrão de
// inventoryService.ts / warehouseStockService.ts).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const InventoryService = require('./inventoryService');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WarehouseStockService = require('./warehouseStockService');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CostingService = require('./costingService');

/**
 * Porta mínima de persistência de lote exigida por
 * {@link receiveMaterialIntoQuarantine}. `PurchaseRepository` e
 * `ComexRepository` implementam esta forma.
 */
interface LotGateway {
  findLotForReceipt(where: Record<string, unknown>, transaction: Transaction): Promise<any | null>;
  createLot(data: Record<string, unknown>, transaction: Transaction): Promise<any>;
}

/** Entrada de {@link receiveMaterialIntoQuarantine}. */
interface ReceiveMaterialIntoQuarantineInput {
  /** `products.id` legado (a tabela de estoque continua sendo a legada). */
  productId: number;
  /** Quantidade recebida nesta entrada (> 0). */
  quantity: number;
  /** Custo unitário real desta entrada (preço de compra ou custo nacionalizado). */
  unitCost: number;
  /** Usuário autenticado responsável pelo recebimento (nunca vem do body — anti-spoofing). */
  userId: number;
  /** `warehouses.id` de destino, já resolvido pelo chamador. */
  warehouseId: number;
  /** Número do lote (informado pelo recebedor ou gerado por {@link buildGeneratedLotNumber}). */
  lotNumber: string;
  /** Chave de busca do lote já existente (recebimento parcial do mesmo lote). */
  lotLookup: Record<string, unknown>;
  /** Vínculos de origem gravados no lote (`supplier_id`, `purchase_id`, ...). */
  lotOwnership: Record<string, unknown>;
  /** Datas do lote. `receivedAt` é obrigatório; as demais são opcionais. */
  lotDates: { receivedAt: unknown; manufacturedAt?: unknown; expiresAt?: unknown };
  /** Observação informada pelo recebedor para o lote (opcional). */
  lotNotes?: string | null;
  /** Observação padrão do lote quando o recebedor não informa nenhuma. */
  defaultLotNotes: string;
  /** Dados da movimentação de estoque (`inventory_movements`). */
  movement: { description: string; referenceId: number; referenceType: string };
  /** Dados do lançamento no ledger de custo real (`product_cost_ledgers`). */
  costing: { sourceType: string; sourceId: number; notes: string };
  /** Repositório do módulo chamador (ver {@link LotGateway}). */
  lotGateway: LotGateway;
  /** Transação Sequelize ativa — TODOS os passos rodam dentro dela. */
  transaction: Transaction;
}

/**
 * Monta um número de lote determinístico para entradas em que o fornecedor
 * não informou lote próprio.
 *
 * Formato: `<documento>-ITEM<idDoItem>-R<seq 3 dígitos>`, por exemplo
 * `PO-2026-0007-ITEM81-R001` (compra) ou `IMP-2026-0001-ITEM10-R001`
 * (importação). O par (`documento`, `idDoItem`) é único no banco, então o
 * número resultante nunca colide com o índice único
 * `(product_id, lot_number)` de `lot_controls`.
 *
 * @param documentNumber - Número do pedido de compra ou do processo de importação.
 * @param sourceItemId - Id da linha de origem (`purchase_order_items.id` / `import_process_items.id`).
 * @param sequence - Sequencial dentro deste recebimento (1, 2, 3...).
 * @returns Número de lote gerado.
 */
function buildGeneratedLotNumber(documentNumber: string, sourceItemId: number | string, sequence: number): string {
  return `${documentNumber}-ITEM${sourceItemId}-R${String(sequence).padStart(3, '0')}`;
}

/**
 * Dá entrada de UM item de material comprado, no padrão completo de
 * rastreabilidade: estoque + depósito + lote em quarentena + custo real.
 *
 * Não abre transação própria de propósito: quem chama já está dentro de uma
 * (o recebimento inteiro tem que ser atômico — meio recebimento gravado é
 * pior do que nenhum).
 *
 * @param input - Ver {@link ReceiveMaterialIntoQuarantineInput}.
 * @returns `{ product, lot }` — produto já com o saldo atualizado e o lote criado/atualizado.
 */
async function receiveMaterialIntoQuarantine(input: ReceiveMaterialIntoQuarantineInput): Promise<{ product: any; lot: any }> {
  const {
    productId, quantity, unitCost, userId, warehouseId,
    lotNumber, lotLookup, lotOwnership, lotDates, lotNotes, defaultLotNotes,
    movement, costing, lotGateway, transaction,
  } = input;

  // 1) Saldo global legado + movimentação de estoque (rastro da origem).
  const { product } = await InventoryService.receive(productId, quantity, userId, transaction, {
    description: movement.description,
    referenceId: movement.referenceId,
    referenceType: movement.referenceType,
    warehouseId,
  });

  // 2) Dual-write (BUSINESS_RULES.md §12 item 3): mantém o saldo por depósito
  // em sincronia com products.quantity acima, na MESMA transação.
  await WarehouseStockService.addToWarehouse(productId, warehouseId, quantity, transaction);

  // 3) Lote nasce/permanece em quarentena — gate de qualidade obrigatório.
  const existingLot = await lotGateway.findLotForReceipt(lotLookup, transaction);
  let lot: any;

  if (existingLot) {
    const nextInitial = parseFloat(existingLot.quantity_initial || 0) + quantity;
    const nextAvailable = parseFloat(existingLot.quantity_available || 0) + quantity;
    await existingLot.update({
      ...lotOwnership,
      status: 'quarantine',
      warehouse_id: warehouseId,
      quantity_initial: nextInitial,
      quantity_available: nextAvailable,
      received_at: lotDates.receivedAt,
      manufactured_at: lotDates.manufacturedAt || existingLot.manufactured_at || null,
      expires_at: lotDates.expiresAt || existingLot.expires_at || null,
      created_by: userId,
      notes: lotNotes || existingLot.notes || defaultLotNotes,
    }, { transaction });
    lot = existingLot;
  } else {
    lot = await lotGateway.createLot({
      product_id: productId,
      ...lotOwnership,
      lot_number: lotNumber,
      status: 'quarantine',
      warehouse_id: warehouseId,
      quantity_initial: quantity,
      quantity_available: quantity,
      received_at: lotDates.receivedAt,
      manufactured_at: lotDates.manufacturedAt || null,
      expires_at: lotDates.expiresAt || null,
      created_by: userId,
      notes: lotNotes || defaultLotNotes,
    }, transaction);
  }

  // 4) Custo real médio ponderado.
  await CostingService.registerWeightedAverageCost({
    product,
    quantity,
    unitCost,
    sourceType: costing.sourceType,
    sourceId: costing.sourceId,
    userId,
    notes: costing.notes,
  }, transaction);

  return { product, lot };
}

// ATENÇÃO (armadilha conhecida do projeto): este objeto SUBSTITUI qualquer
// named export em tempo de execução (`require`). Toda função nova precisa
// aparecer aqui também — mesma regra de `inventoryService.ts`.
module.exports = {
  receiveMaterialIntoQuarantine,
  buildGeneratedLotNumber,
};
