/**
 * 🚚 SaleStockService — baixa de estoque da venda no momento fiscal correto.
 *
 * Gap G9 (2026-08-10, decisão D-A do dono em
 * `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4): a baixa de
 * estoque do pedido de venda saiu da **confirmação** e passou para a
 * **autorização da NF-e**.
 *
 * ## Base normativa
 *
 * Ajuste SINIEF 07/05, cláusula 1ª §1º e cláusula 9ª §1º: a NF-e é
 * autorizada antes do fato gerador e a mercadoria só pode transitar depois
 * da autorização de uso. Enquanto o pedido está apenas `confirmed`, a
 * mercadoria continua fisicamente na empresa — o correto é ela estar
 * **reservada** (comprometida, indisponível para outro pedido), não
 * baixada.
 *
 * ## Quem chama
 *
 * Os dois caminhos que podem autorizar uma emissão:
 *  - `IssueSaleNfeUseCase` (síncrono — provedor mock/retorno imediato);
 *  - `GetSaleNfeStatusUseCase` (assíncrono — provedores reais, reconsulta
 *    manual ou webhook).
 *
 * Ambos chamam `commitInvoicedStock` **na mesma transação** em que
 * incrementam `SaleItem.invoiced_quantity`, para que "quantidade faturada"
 * e "quantidade baixada do estoque" nunca divirjam.
 *
 * ## Faturamento parcial
 *
 * A baixa acompanha a quantidade **desta emissão**, não o pedido inteiro.
 * Uma venda de 10 unidades faturada em 4 + 6 gera duas baixas (4 e 6),
 * consumindo a reserva do pedido aos poucos.
 *
 * ## Gate de qualidade na saída (D-L, 2026-08-10)
 *
 * Até 2026-08-10 este serviço **não consultava status de lote**: produto
 * acabado com lote `quarantine`/`blocked` era faturado normalmente, e o gate
 * de qualidade só existia na entrada (G7). A decisão **D-L** do dono fechou
 * o outro lado: a baixa agora passa por `services/saleLotService.ts`, que
 * bloqueia a emissão quando o saldo liberado não a cobre e há lote retido, e
 * grava em `sale_lot_shipments` de qual lote cada emissão saiu — o registro
 * que a devolução do **D-M** usa para voltar ao MESMO lote.
 *
 * @module services/saleStockService
 */

import { Transaction } from 'sequelize';

// Serviços carregados via CommonJS (hybrid mode, mesmo padrão de
// inventoryService.ts / warehouseStockService.ts).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const InventoryService = require('./inventoryService');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WarehouseStockService = require('./warehouseStockService');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SaleLotService = require('./saleLotService');

/** Uma linha de baixa: produto e quantidade desta emissão. */
export interface InvoicedStockLine {
  productId: number;
  quantity: number;
}

/** Resultado consolidado por produto, útil para log/auditoria. */
export interface CommitInvoicedStockResult {
  productId: number;
  quantity: number;
  /** Quanto da reserva do pedido foi de fato consumido (0 em venda legada sem reserva). */
  releasedFromReservation: number;
  /** Lotes de onde a mercadoria saiu (D-L/D-M); vazio em produto sem lote. */
  lots: Array<{ lotId: number; lotNumber: string; quantity: number }>;
}

/** Abaixo disso, diferença de quantidade é ruído de DECIMAL(18,6). */
const QUANTITY_EPSILON = 0.0000005;

/**
 * Soma as quantidades por produto.
 *
 * Uma venda não deveria ter duas linhas do mesmo produto (`EditSaleItems`
 * recusa `product_id` duplicado), mas `POST /api/sales` nunca proibiu isso —
 * agregar aqui evita duas liberações/baixas separadas do mesmo produto na
 * mesma transação, que só disputariam o mesmo lock.
 *
 * @param lines - Linhas cruas (produto × quantidade).
 * @returns Linhas agregadas por produto, em ordem estável de `productId`.
 */
function aggregateByProduct(lines: InvoicedStockLine[]): InvoicedStockLine[] {
  const byProduct = new Map<number, number>();

  for (const line of lines) {
    const productId = Number(line.productId);
    const quantity = Number(line.quantity);
    if (!Number.isFinite(productId) || !Number.isFinite(quantity) || quantity <= QUANTITY_EPSILON) continue;
    byProduct.set(productId, (byProduct.get(productId) ?? 0) + quantity);
  }

  // Ordem estável por produto: mesma ordem de travamento usada em
  // `releaseAllReservationsForOwner`, para não criar ciclo de deadlock
  // entre duas emissões concorrentes que compartilhem produtos.
  return Array.from(byProduct.entries())
    .sort(([a], [b]) => a - b)
    .map(([productId, quantity]) => ({ productId, quantity }));
}

/**
 * Baixa do estoque a quantidade efetivamente faturada de uma venda,
 * consumindo a reserva criada na confirmação do pedido.
 *
 * Sequência por produto (a ordem importa):
 *   1. **libera** a reserva daquela venda no montante faturado — sem isso o
 *      passo 2 falharia, porque `InventoryService.consume` valida
 *      `quantity - reserved_quantity` e o próprio pedido estaria bloqueando
 *      o material que ele mesmo vai levar;
 *   2. **consome** `products.quantity` (gera o `InventoryMovement` de saída
 *      com `reference_type = 'sale'`);
 *   3. **debita** o depósito ACABADOS (dual-write obrigatório,
 *      `BUSINESS_RULES.md` §12 item 3/7).
 *
 * Venda sem reserva (pedido confirmado antes da migration do G9 e não
 * coberto pelo backfill, ou dado legado) cai no no-op silencioso de
 * `releaseReservation` e segue direto para o consumo — o comportamento
 * degrada para a regra antiga em vez de travar o faturamento.
 *
 * @param saleId - ID da venda dona da reserva.
 * @param lines - Produto × quantidade **desta emissão** (não do pedido inteiro).
 * @param userId - ID do usuário responsável (do JWT; na reconciliação assíncrona, o vendedor da venda).
 * @param transaction - Transação Sequelize ativa (a mesma que grava `invoiced_quantity`).
 * @param options - `description` do movimento gerado e `saleInvoiceId` (emissão dona da saída por lote, D-L/D-M).
 * @returns Uma entrada por produto, com o quanto saiu da reserva e de quais lotes.
 * @throws {Error} 404 se o produto não existir; 422 se não houver estoque suficiente.
 * @throws {BusinessRuleError} 422 `details.rule = 'D-L'` se o produto depender de lote não liberado pela Qualidade.
 */
export async function commitInvoicedStock(
  saleId: number,
  lines: InvoicedStockLine[],
  userId: number,
  transaction: Transaction,
  options: { description?: string; saleInvoiceId?: number | null } = {}
): Promise<CommitInvoicedStockResult[]> {
  const aggregated = aggregateByProduct(lines);
  if (aggregated.length === 0) return [];

  const description = options.description ?? `Faturamento (NF-e) da venda #${saleId}`;
  const acabadosWarehouse = await WarehouseStockService.getWarehouseByCode('ACABADOS', transaction);

  const results: CommitInvoicedStockResult[] = [];
  for (const { productId, quantity } of aggregated) {
    // D-L: o gate de qualidade na saída vem ANTES de qualquer escrita deste
    // produto — se o lote não estiver liberado, nada é gravado. A revalidação
    // aqui é sob `FOR UPDATE` (a pré-checagem de `IssueSaleNfeUseCase` roda na
    // transação anterior, sem lock, e serve para não queimar número de NF-e).
    const lots = await SaleLotService.shipLotsForInvoice({
      saleId,
      saleInvoiceId: options.saleInvoiceId ?? undefined,
      productId,
      quantity,
      userId,
      transaction,
      notes: description,
    });

    const release = await InventoryService.releaseReservation(productId, quantity, userId, transaction, {
      saleId,
      description: `Reserva consumida pelo faturamento da venda #${saleId}`,
    });

    await InventoryService.consume(productId, quantity, userId, transaction, {
      description,
      referenceId: saleId,
      referenceType: 'sale',
    });

    await WarehouseStockService.removeFromWarehouse(productId, acabadosWarehouse.id, quantity, transaction);

    results.push({
      productId,
      quantity,
      releasedFromReservation: Number(release?.quantityAffected ?? 0),
      lots,
    });
  }

  return results;
}

/** Resultado por produto da devolução de estoque de uma emissão cancelada. */
export interface RestoreInvoicedStockResult {
  productId: number;
  quantity: number;
  /** Lotes que receberam a devolução (vazio em venda anterior ao D-M, sem rastro por lote). */
  lots: Array<{ lotId: number; lotNumber: string; quantity: number }>;
  /** Quanto voltou a ficar reservado para a própria venda. */
  reserved: number;
}

/**
 * **D-M — cancelar a NF-e devolve o produto ao estoque.**
 *
 * Decisão do dono em 2026-08-10
 * (`docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4): até então
 * cancelar uma NF-e autorizada **não devolvia estoque** — comportamento
 * mantido de propósito no G9 para "baixado == faturado" seguir valendo.
 * Cancelou a nota, a mercadoria volta a existir.
 *
 * O inverso exato de {@link commitInvoicedStock}, na mesma ordem invertida:
 *  1. **devolve ao(s) mesmo(s) lote(s)** de onde saiu (`sale_lot_shipments`),
 *     porque devolver a outro lote quebraria a rastreabilidade;
 *  2. **credita** `products.quantity` (movimento `in`, `reference_type =
 *     'sale'`, apontando para a própria venda);
 *  3. **credita** o depósito ACABADOS (dual-write obrigatório);
 *  4. **volta a reservar** para a própria venda, quando pedido — o pedido
 *     regride para `confirmed`/`partially_invoiced`, e nesse estado a regra
 *     do G9 é "confirmado = reservado". Sem isso a mercadoria voltaria
 *     "solta" e outro pedido poderia levá-la.
 *
 * @param saleId - Venda dona da devolução.
 * @param lines - Produto × quantidade **daquela emissão** (do snapshot `sale_invoices.items`).
 * @param userId - Responsável (do JWT).
 * @param transaction - Transação ativa (a mesma que decrementa `invoiced_quantity`).
 * @param options.description - Descrição do movimento gerado.
 * @param options.saleInvoiceId - Emissão cancelada; sem ela a devolução ao lote pegaria saídas de outras notas.
 * @param options.reserve - `true` (padrão) volta a reservar para a venda.
 * @returns Uma entrada por produto devolvido.
 */
export async function restoreInvoicedStock(
  saleId: number,
  lines: InvoicedStockLine[],
  userId: number,
  transaction: Transaction,
  options: { description?: string; saleInvoiceId?: number | null; reserve?: boolean } = {}
): Promise<RestoreInvoicedStockResult[]> {
  const aggregated = aggregateByProduct(lines);
  if (aggregated.length === 0) return [];

  const description = options.description ?? `Cancelamento da NF-e da venda #${saleId} - estoque devolvido`;
  const acabadosWarehouse = await WarehouseStockService.getWarehouseByCode('ACABADOS', transaction);
  const shouldReserve = options.reserve !== false;

  // D-M: a devolução ao lote é feita de uma vez para toda a emissão (a
  // consulta é por `sale_invoice_id`), e não produto a produto — assim uma
  // linha de `sale_lot_shipments` nunca é devolvida duas vezes.
  const returned = await SaleLotService.returnLotShipments({
    saleId,
    saleInvoiceId: options.saleInvoiceId ?? undefined,
    transaction,
    notes: description,
  });
  const returnedByProduct = new Map<number, Array<{ lotId: number; lotNumber: string; quantity: number }>>();
  for (const row of returned as Array<{ productId: number; lotId: number; lotNumber: string; quantity: number }>) {
    const list = returnedByProduct.get(Number(row.productId)) ?? [];
    list.push({ lotId: row.lotId, lotNumber: row.lotNumber, quantity: row.quantity });
    returnedByProduct.set(Number(row.productId), list);
  }

  const results: RestoreInvoicedStockResult[] = [];
  for (const { productId, quantity } of aggregated) {
    await InventoryService.receive(productId, quantity, userId, transaction, {
      description,
      referenceId: saleId,
      referenceType: 'sale',
    });

    await WarehouseStockService.addToWarehouse(productId, acabadosWarehouse.id, quantity, transaction);

    let reserved = 0;
    if (shouldReserve) {
      const reservation = await InventoryService.reserve(productId, quantity, userId, transaction, {
        saleId,
        description: `NF-e cancelada - quantidade volta a ser reservada pela venda #${saleId}`,
      });
      reserved = Number(reservation?.quantityAffected ?? 0);
    }

    results.push({
      productId,
      quantity,
      lots: returnedByProduct.get(productId) ?? [],
      reserved,
    });
  }

  return results;
}

// CommonJS compatibility (mesmo padrão de warehouseStockService.ts).
// ATENÇÃO: este objeto SUBSTITUI os named exports acima em tempo de
// execução (require) — toda função nova precisa aparecer aqui também.
module.exports = { commitInvoicedStock, restoreInvoicedStock };
