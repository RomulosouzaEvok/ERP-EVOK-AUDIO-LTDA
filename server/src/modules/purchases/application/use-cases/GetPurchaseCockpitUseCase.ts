import type PurchaseRepository = require('../../domain/repositories/PurchaseRepository');

const UseCase = require('../../../../shared/application/UseCase');

/**
 * Calcula as métricas do cockpit de compras, cobrindo o fluxo do endpoint
 * `GET /api/purchases/cockpit`.
 *
 * Reúne, em uma única chamada, quatro indicadores usados pelo painel de
 * suprimentos: requisições pendentes de aprovação, pedidos de compra em
 * aberto (contagem + valor total), pedidos com chegada prevista nos
 * próximos 7 dias e pedidos em atraso (data prevista vencida sem
 * recebimento registrado).
 */
class GetPurchaseCockpitUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/PurchaseRepository')} purchaseRepository
   */
  private purchaseRepository: PurchaseRepository;

  constructor(purchaseRepository: PurchaseRepository) {
    super();
    this.purchaseRepository = purchaseRepository;
  }

  /**
   * @returns {Promise<{
   *   pending_requisitions: number,
   *   open_orders: { count: number, total_amount: number },
   *   arriving_this_week: number,
   *   overdue: number
   * }>}
   */
  async execute() {
    return this.purchaseRepository.getCockpitMetrics();
  }
}

module.exports = GetPurchaseCockpitUseCase;
