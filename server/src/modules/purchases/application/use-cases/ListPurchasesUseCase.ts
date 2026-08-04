const UseCase = require('../../../../shared/application/UseCase');
const { calculateHandoffSignal } = require('../../../../shared/domain/handoffSignal');

/**
 * Lista pedidos de compra com filtros e paginação, cobrindo o fluxo do
 * endpoint `GET /api/purchases`.
 *
 * Bloco 3 (UC-40, BUSINESS_RULES.md §10): cada linha retornada ganha o
 * campo aditivo `handoff_signal` (`green|yellow|red`), calculado via
 * `calculateHandoffSignal('purchase', ...)` — fila de Recebimento
 * (Compras → Recebimento). Campo é sempre calculado on-the-fly, nunca
 * persistido; não altera o formato/contrato existente da resposta (apenas
 * adiciona uma chave nova a cada objeto de `rows`).
 */
class ListPurchasesUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/PurchaseRepository')} purchaseRepository
   */
  constructor(purchaseRepository) {
    super();
    this.purchaseRepository = purchaseRepository;
  }

  /**
   * @param {Object} input
   * @param {string} [input.status]
   * @param {number} [input.supplier_id]
   * @param {string} [input.start_date]
   * @param {string} [input.end_date]
   * @param {number} input.page
   * @param {number} input.limit
   * @param {number} input.offset
   * @returns {Promise<{ rows: Object[], count: number, page: number, limit: number, totalPages: number }>}
   */
  async execute({ status, supplier_id, start_date, end_date, page, limit, offset }) {
    const { rows, count } = await this.purchaseRepository.listPurchases(
      { status, supplier_id, start_date, end_date },
      { limit, offset }
    );

    const rowsWithSignal = rows.map((row) => {
      const json = row.toJSON ? row.toJSON() : row;
      return {
        ...json,
        handoff_signal: calculateHandoffSignal('purchase', {
          status: json.status,
          expected_date: json.expected_date,
          delivery_date: json.delivery_date,
        }),
      };
    });

    return { rows: rowsWithSignal, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

module.exports = ListPurchasesUseCase;


