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
 * @module services/saleStockService
 */

import { Transaction } from 'sequelize';

// Serviços carregados via CommonJS (hybrid mode, mesmo padrão de
// inventoryService.ts / warehouseStockService.ts).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const InventoryService = require('./inventoryService');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WarehouseStockService = require('./warehouseStockService');

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
 * @param options - `description` do movimento gerado.
 * @returns Uma entrada por produto, com o quanto saiu da reserva.
 * @throws {Error} 404 se o produto não existir; 422 se não houver estoque suficiente.
 */
export async function commitInvoicedStock(
  saleId: number,
  lines: InvoicedStockLine[],
  userId: number,
  transaction: Transaction,
  options: { description?: string } = {}
): Promise<CommitInvoicedStockResult[]> {
  const aggregated = aggregateByProduct(lines);
  if (aggregated.length === 0) return [];

  const description = options.description ?? `Faturamento (NF-e) da venda #${saleId}`;
  const acabadosWarehouse = await WarehouseStockService.getWarehouseByCode('ACABADOS', transaction);

  const results: CommitInvoicedStockResult[] = [];
  for (const { productId, quantity } of aggregated) {
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
    });
  }

  return results;
}

// CommonJS compatibility (mesmo padrão de warehouseStockService.ts).
// ATENÇÃO: este objeto SUBSTITUI os named exports acima em tempo de
// execução (require) — toda função nova precisa aparecer aqui também.
module.exports = { commitInvoicedStock };
