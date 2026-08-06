/**
 * Caso de uso para montar o mapa comparativo de uma RFQ: por item, o preco
 * de cada fornecedor que respondeu, destacando o menor preco e o menor
 * prazo de entrega, alem do total cotado por fornecedor (soma dos itens que
 * aquele fornecedor efetivamente cotou).
 *
 * @module modules/rfq/application/use-cases/GetRfqComparisonUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import RfqRepository from '../../domain/repositories/RfqRepository';

interface GetRfqComparisonInput {
  id: number;
}

class GetRfqComparisonUseCase extends UseCase<GetRfqComparisonInput, any> {
  private readonly rfqRepository: RfqRepository;

  public constructor(rfqRepository: RfqRepository) {
    super();
    this.rfqRepository = rfqRepository;
  }

  /**
   * @param input - Id da RFQ.
   * @returns `{ rfq, items: [{ rfq_item_id, item, quantity, unit, awarded_supplier_id, quotes: [...] }], supplier_totals: [...] }`.
   * @throws {NotFoundError} Se a RFQ nao existir.
   */
  public async execute(input: GetRfqComparisonInput): Promise<any> {
    const rfq = await this.rfqRepository.findRfqById(input.id);
    if (!rfq) {
      throw new NotFoundError('Cotacao (RFQ) nao encontrada.');
    }

    const rfqJson = rfq.toJSON ? rfq.toJSON() : rfq;
    const items: any[] = rfqJson.items ?? [];

    const supplierTotalsMap = new Map<number, { supplier_id: number; supplier_name: string; items_quoted_count: number; total_amount: number }>();

    const comparisonItems = items.map((item) => {
      const quantity = parseFloat(item.quantity);
      const quotes: any[] = item.quotes ?? [];

      let bestPrice: number | null = null;
      let bestLeadTime: number | null = null;
      for (const quote of quotes) {
        const price = parseFloat(quote.unit_price);
        if (bestPrice === null || price < bestPrice) bestPrice = price;
        if (quote.lead_time_days != null) {
          const leadTime = Number(quote.lead_time_days);
          if (bestLeadTime === null || leadTime < bestLeadTime) bestLeadTime = leadTime;
        }
      }

      const quoteRows = quotes.map((quote) => {
        const unitPrice = parseFloat(quote.unit_price);
        const lineTotal = quantity * unitPrice;
        const supplierId = quote.supplier_id;
        const supplierName = quote.supplier?.company_name ?? `Fornecedor ${supplierId}`;

        const totals = supplierTotalsMap.get(supplierId) ?? {
          supplier_id: supplierId,
          supplier_name: supplierName,
          items_quoted_count: 0,
          total_amount: 0,
        };
        totals.items_quoted_count += 1;
        totals.total_amount += lineTotal;
        supplierTotalsMap.set(supplierId, totals);

        return {
          quote_id: quote.id,
          supplier_id: supplierId,
          supplier_name: supplierName,
          unit_price: unitPrice,
          lead_time_days: quote.lead_time_days ?? null,
          moq: quote.moq != null ? parseFloat(quote.moq) : null,
          validity_date: quote.validity_date ?? null,
          notes: quote.notes ?? null,
          line_total: lineTotal,
          is_best_price: bestPrice !== null && unitPrice === bestPrice,
          is_best_lead_time: bestLeadTime !== null && quote.lead_time_days != null && Number(quote.lead_time_days) === bestLeadTime,
        };
      });

      return {
        rfq_item_id: item.id,
        item_id: item.item_id,
        item: item.item ? { id: item.item.id, codigo: item.item.codigo, descricao: item.item.descricao } : null,
        quantity,
        unit: item.unit ?? null,
        awarded_supplier_id: item.awarded_supplier_id ?? null,
        awarded_unit_price: item.awarded_unit_price != null ? parseFloat(item.awarded_unit_price) : null,
        quotes: quoteRows,
      };
    });

    return {
      rfq: {
        id: rfqJson.id,
        rfq_number: rfqJson.rfq_number,
        status: rfqJson.status,
        requisition_id: rfqJson.requisition_id,
      },
      items: comparisonItems,
      supplier_totals: Array.from(supplierTotalsMap.values()).sort((a, b) => a.total_amount - b.total_amount),
    };
  }
}

export = GetRfqComparisonUseCase;
