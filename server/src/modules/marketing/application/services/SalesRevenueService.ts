/**
 * Interface de serviço para agregação de receita atribuída de vendas a
 * partir do módulo `marketing` (RF-MKT-008/009/029), usada por
 * `RecalculateCampaignMetricsUseCase` e `GetFunnelReportUseCase`/
 * `GetEventsReportUseCase`. Implementada por `SalesRevenueServiceAdapter`.
 *
 * @module modules/marketing/application/services/SalesRevenueService
 */

class SalesRevenueService {
  /**
   * Soma `sales.total_amount` das vendas com status faturado/embarcado
   * (`invoiced`/`shipped`, nunca `canceled`) dos clientes informados,
   * dentro da janela `[sinceDate, untilDate]`.
   *
   * @param _clientIds - Ids de `clients.id` (tipicamente `converted_to_customer_id` dos leads).
   * @param _sinceDate - Início da janela de atribuição.
   * @param _untilDate - Fim da janela de atribuição (padrão: agora).
   * @returns Soma como string decimal (nunca `number`, mesma convenção do projeto).
   * @abstract
   */
  public async getAttributedRevenue(_clientIds: number[], _sinceDate: Date, _untilDate?: Date): Promise<string> {
    throw new Error('SalesRevenueService.getAttributedRevenue não implementado.');
  }
}

export = SalesRevenueService;
