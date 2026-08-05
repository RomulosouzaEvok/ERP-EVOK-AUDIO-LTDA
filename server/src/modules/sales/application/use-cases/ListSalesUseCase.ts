const UseCase = require('../../../../shared/application/UseCase');
const { calculateHandoffSignal } = require('../../../../shared/domain/handoffSignal');

/**
 * Lista vendas com filtros e paginação, cobrindo o fluxo do endpoint
 * `GET /api/sales`.
 *
 * Bloco 3 (UC-40, BUSINESS_RULES.md §10): cada linha ganha o campo aditivo
 * `handoff_signal` (`green|yellow|red`), calculado via
 * `calculateHandoffSignal('sale', ...)` — fila de Expedição (Vendas →
 * Expedição). Campo sempre calculado on-the-fly, nunca persistido.
 */
class ListSalesUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/SaleRepository')} saleRepository
   */
  constructor(saleRepository: any) {
    super();
    this.saleRepository = saleRepository;
  }

  /**
   * @param {Object} input
   * @param {string} [input.status]
   * @param {number} [input.customer_id]
   * @param {string} [input.start_date]
   * @param {string} [input.end_date]
   * @param {number} input.page
   * @param {number} input.limit
   * @param {number} input.offset
   * @returns {Promise<{ rows: Object[], count: number, page: number, limit: number, totalPages: number }>}
   */
  async execute({ status, customer_id, start_date, end_date, page, limit, offset }: {
    status?: string;
    customer_id?: number;
    start_date?: string;
    end_date?: string;
    page: number;
    limit: number;
    offset: number;
  }) {
    const { rows, count } = await this.saleRepository.listSales(
      { status, customer_id, start_date, end_date },
      { limit, offset }
    );

    // Anexa `items_count` e `handoff_signal` a cada venda. `items_count`
    // preservado 1:1 do controller anterior
    // (`server/src/controllers/saleController.ts#list`); `handoff_signal`
    // e o enriquecimento aditivo do Bloco 3.
    const salesWithCount = rows.map((s: any) => {
      const json = s.toJSON();
      return {
        ...json,
        items_count: s.items ? s.items.length : 0,
        handoff_signal: calculateHandoffSignal('sale', { status: json.status, nfe_status: json.nfe_status }),
      };
    });

    return { rows: salesWithCount, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

module.exports = ListSalesUseCase;


