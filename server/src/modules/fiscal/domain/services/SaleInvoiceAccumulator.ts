/**
 * Lógica pura de acúmulo de `invoiced_quantity` e transição de status da
 * venda, compartilhada entre os dois caminhos que podem autorizar uma
 * emissão de NF-e:
 *
 *  - `IssueSaleNfeUseCase` (caminho síncrono — o provedor mock, usado em
 *    testes, autoriza dentro da própria chamada HTTP);
 *  - `GetSaleNfeStatusUseCase` (caminho assíncrono — provedores reais,
 *    `focus_nfe`/`enotas`, autorizam depois, via reconsulta manual ou
 *    webhook).
 *
 * Antes desta extração (2026-08-06, "Reconciliação assíncrona de
 * provedores reais" em `docs/governance/TODO.md`), só o caminho síncrono
 * aplicava esta regra — o caminho assíncrono apenas finalizava
 * `confirmed -> invoiced`, sem incrementar `invoiced_quantity` nem suportar
 * faturamento parcial. Esta classe não faz I/O (não salva nada) — os use
 * cases continuam donos de carregar/travar os registros e persistir o
 * resultado.
 *
 * @module modules/fiscal/domain/services/SaleInvoiceAccumulator
 */

interface SaleItemLike {
  id: number;
  quantity: number | string;
  invoiced_quantity: number | string;
}

interface ItemUpdate {
  item: SaleItemLike;
  newInvoicedQuantity: number;
}

class SaleInvoiceAccumulator {
  /**
   * Calcula, para cada item da venda, a nova `invoiced_quantity` (soma da
   * atual com a quantidade desta emissão, quando o item participa dela) e
   * se ainda resta saldo pendente em QUALQUER item da venda.
   *
   * @param {Array<Object>} items - Todos os itens da venda (`SaleItem`), com `id`, `quantity`, `invoiced_quantity` atuais.
   * @param {Map<number, number>} qtyToInvoiceByItemId - Quantidade desta emissão por `sale_item_id` (apenas os itens que participam desta nota).
   * @returns {{updates: Array<{item: Object, newInvoicedQuantity: number}>, anyRemaining: boolean}}
   *   `updates` traz apenas os itens efetivamente tocados por esta emissão (para o use case aplicar e salvar);
   *   `anyRemaining` considera o saldo pendente de TODOS os itens da venda (não só os desta emissão).
   */
  static applyInvoicedQuantities(items: SaleItemLike[], qtyToInvoiceByItemId: Map<number, number>): { updates: ItemUpdate[]; anyRemaining: boolean } {
    const updates: ItemUpdate[] = [];
    let anyRemaining = false;

    for (const item of items) {
      const invoiceQty = qtyToInvoiceByItemId.get(item.id);
      const currentInvoiced = parseFloat(String(item.invoiced_quantity || 0));
      const newInvoicedQuantity = invoiceQty ? currentInvoiced + invoiceQty : currentInvoiced;

      if (invoiceQty) {
        updates.push({ item, newInvoicedQuantity });
      }

      if (parseFloat(String(item.quantity)) - newInvoicedQuantity > 1e-9) {
        anyRemaining = true;
      }
    }

    return { updates, anyRemaining };
  }

  /**
   * Resolve o novo status da venda após uma emissão autorizada. Só
   * transiciona a partir de `confirmed`/`partially_invoiced` (mesma regra
   * de antes) — qualquer outro status de origem é preservado (nunca força
   * uma transição fora da máquina de estados de `Sale`).
   *
   * @param {string} currentStatus - Status atual da venda.
   * @param {boolean} anyRemaining - Se ainda há saldo pendente em algum item.
   * @returns {string} O novo status (`invoiced`/`partially_invoiced`) ou o status inalterado.
   */
  static resolveSaleStatus(currentStatus: string, anyRemaining: boolean): string {
    if (currentStatus === 'confirmed' || currentStatus === 'partially_invoiced') {
      return anyRemaining ? 'partially_invoiced' : 'invoiced';
    }
    return currentStatus;
  }
}

export = SaleInvoiceAccumulator;
