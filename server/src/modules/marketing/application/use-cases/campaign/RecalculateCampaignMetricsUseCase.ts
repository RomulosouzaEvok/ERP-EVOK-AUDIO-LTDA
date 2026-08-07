/**
 * Caso de uso: recálculo idempotente do cache de métricas de campanha
 * (`leads_generated`/`conversions`/`roi`), cobrindo o fluxo do endpoint
 * `POST /api/marketing/campaigns/:id/recalculate-metrics`
 * (RF-MKT-007/008/009, RNF-MKT-001).
 *
 * Idempotente por construção: sempre recalcula a partir dos vínculos reais
 * (contagem de leads/conversões, soma de receita atribuída), nunca
 * incrementa — rodar duas vezes seguidas produz o mesmo resultado.
 *
 * `roi` é calculado POR LEAD convertido (janela de atribuição RF-MKT-010 a
 * partir de `converted_at` de cada lead, não da campanha), para não
 * superestimar quando leads convertem em datas muito diferentes — soma-se
 * a receita atribuída de cada lead e divide pelo `actual_cost` total da
 * campanha. Leads `converted` sem `converted_at` (conversões legadas antes
 * desta correção) são ignorados no cálculo de receita — não há como inferir
 * a janela de atribuição sem o timestamp.
 *
 * @module modules/marketing/application/use-cases/campaign/RecalculateCampaignMetricsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import CampaignRepository from '../../../domain/repositories/CampaignRepository';
import LeadRepository from '../../../domain/repositories/LeadRepository';
import SalesRevenueService from '../../services/SalesRevenueService';
import { REVENUE_ATTRIBUTION_WINDOW_DAYS } from '../../../domain/constants';

type RecalculateCampaignMetricsInput = { id: number };

class RecalculateCampaignMetricsUseCase extends UseCase<RecalculateCampaignMetricsInput, any> {
  private readonly campaignRepository: CampaignRepository;
  private readonly leadRepository: LeadRepository;
  private readonly salesRevenueService: SalesRevenueService;

  constructor(campaignRepository: CampaignRepository, leadRepository: LeadRepository, salesRevenueService: SalesRevenueService) {
    super();
    this.campaignRepository = campaignRepository;
    this.leadRepository = leadRepository;
    this.salesRevenueService = salesRevenueService;
  }

  /** @throws {NotFoundError} Se a campanha não existir. */
  async execute({ id }: RecalculateCampaignMetricsInput) {
    const campaign = await this.campaignRepository.findCampaignById(id);
    if (!campaign) {
      throw new NotFoundError('Campanha não encontrada.');
    }

    const leadsGenerated = await this.leadRepository.countByCampaignId(id);
    const convertedLeads = await this.leadRepository.findConvertedByCampaignId(id);

    let attributedRevenue = 0;
    for (const lead of convertedLeads) {
      if (!lead.converted_to_customer_id || !lead.converted_at) continue;
      const since = new Date(lead.converted_at);
      const until = new Date(lead.converted_at);
      until.setDate(until.getDate() + REVENUE_ATTRIBUTION_WINDOW_DAYS);
      const revenue = await this.salesRevenueService.getAttributedRevenue([lead.converted_to_customer_id], since, until);
      attributedRevenue += Number(revenue);
    }

    const actualCost = Number(campaign.actual_cost || 0);
    const roi = actualCost > 0 ? ((attributedRevenue - actualCost) / actualCost).toFixed(2) : null;
    const recalculatedAt = new Date();

    await this.campaignRepository.updateCampaign(id, {
      leads_generated: leadsGenerated,
      conversions: convertedLeads.length,
      roi,
      metrics_recalculated_at: recalculatedAt,
    });

    return {
      id,
      leads_generated: leadsGenerated,
      conversions: convertedLeads.length,
      roi,
      recalculated_at: recalculatedAt,
    };
  }
}

export = RecalculateCampaignMetricsUseCase;
