/**
 * Caso de uso: relatório de KPIs de funil de marketing, cobrindo o fluxo
 * do endpoint `GET /api/marketing/reports/funnel` (RF-MKT-026 a 029,
 * UC-66). 7 dos 8 KPIs do brief (o 8º, custo por lead de evento, é exposto
 * separadamente por `GET /reports/events`/`GET /events/:id`, RF-MKT-027).
 *
 * Fluxo de exceção (UC-66 E1): filtro sem nenhum lead no critério NÃO é
 * erro — todos os campos numéricos retornam `null` (nunca `0`/`NaN`/
 * divisão por zero) e `has_data: false`, sempre `200 OK`.
 *
 * @module modules/marketing/application/use-cases/report/GetFunnelReportUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LeadRepository from '../../../domain/repositories/LeadRepository';
import CampaignRepository from '../../../domain/repositories/CampaignRepository';
import SalesRevenueService from '../../services/SalesRevenueService';
import { REVENUE_ATTRIBUTION_WINDOW_DAYS, HANDOFF_SLA_DAYS } from '../../../domain/constants';

type GetFunnelReportInput = {
  campaign_id?: number;
  lead_source?: string;
  date_from?: string;
  date_to?: string;
};

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

class GetFunnelReportUseCase extends UseCase<GetFunnelReportInput, any> {
  private readonly leadRepository: LeadRepository;
  private readonly campaignRepository: CampaignRepository;
  private readonly salesRevenueService: SalesRevenueService;

  constructor(leadRepository: LeadRepository, campaignRepository: CampaignRepository, salesRevenueService: SalesRevenueService) {
    super();
    this.leadRepository = leadRepository;
    this.campaignRepository = campaignRepository;
    this.salesRevenueService = salesRevenueService;
  }

  async execute({ campaign_id, lead_source, date_from, date_to }: GetFunnelReportInput = {}) {
    const period = { from: date_from ?? null, to: date_to ?? null };
    const filters = { campaign_id: campaign_id ?? null, lead_source: lead_source ?? null };

    const leads = await this.leadRepository.findForFunnelReport({ campaign_id, lead_source, date_from, date_to });

    if (!leads.length) {
      return {
        period,
        filters,
        cost_per_lead: null,
        qualification_rate: null,
        conversion_rate: null,
        attributed_revenue: null,
        roi: null,
        handoff_sla_compliance_rate: null,
        median_lead_cycle_days: null,
        budget_vs_actual: null,
        has_data: false,
      };
    }

    const total = leads.length;
    const qualifiedLeads = leads.filter((l: any) => l.qualified_at);
    const convertedLeads = leads.filter((l: any) => l.status === 'converted');

    const qualificationRate = (qualifiedLeads.length / total).toFixed(2);
    const conversionRate = (convertedLeads.length / total).toFixed(2);

    let attributedRevenue = 0;
    for (const lead of convertedLeads) {
      if (!lead.converted_to_customer_id || !lead.converted_at) continue;
      const since = new Date(lead.converted_at);
      const until = new Date(lead.converted_at);
      until.setDate(until.getDate() + REVENUE_ATTRIBUTION_WINDOW_DAYS);
      const revenue = await this.salesRevenueService.getAttributedRevenue([lead.converted_to_customer_id], since, until);
      attributedRevenue += Number(revenue);
    }

    const compliant = qualifiedLeads.filter((l: any) => {
      if (!l.handoff_at) return false;
      const days = (new Date(l.handoff_at).getTime() - new Date(l.qualified_at).getTime()) / (1000 * 60 * 60 * 24);
      return days <= HANDOFF_SLA_DAYS;
    });
    const handoffSlaComplianceRate = qualifiedLeads.length > 0 ? (compliant.length / qualifiedLeads.length).toFixed(2) : null;

    const cycleDays = convertedLeads
      .filter((l: any) => l.converted_at && l.created_at)
      .map((l: any) => (new Date(l.converted_at).getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const medianLeadCycleDays = median(cycleDays);

    // Custo por lead + orçado x realizado — depende de quais campanhas os leads filtrados referenciam.
    const campaignIds = Array.from(new Set(leads.map((l: any) => l.campaign_id).filter((id: any) => id != null)));
    let campaigns: any[] = [];
    if (campaignIds.length) {
      campaigns = (await Promise.all(campaignIds.map((id) => this.campaignRepository.findCampaignById(id)))).filter(Boolean);
    }

    const sumActualCost = campaigns.reduce((acc, c) => acc + Number(c.actual_cost || 0), 0);
    const costPerLead = sumActualCost > 0 ? (sumActualCost / total).toFixed(2) : null;

    let budgetVsActual: { requested: string; approved: string | null; actual: string } | null = null;
    if (campaigns.length) {
      const requested = campaigns.reduce((acc, c) => acc + Number(c.budget_requested || 0), 0);
      const approved = campaigns.reduce((acc, c) => acc + Number(c.budget_approved || 0), 0);
      budgetVsActual = {
        requested: requested.toFixed(2),
        approved: campaigns.every((c) => c.budget_approved == null) ? null : approved.toFixed(2),
        actual: sumActualCost.toFixed(2),
      };
    }

    const roi = sumActualCost > 0 ? ((attributedRevenue - sumActualCost) / sumActualCost).toFixed(2) : null;

    return {
      period,
      filters,
      cost_per_lead: costPerLead,
      qualification_rate: qualificationRate,
      conversion_rate: conversionRate,
      attributed_revenue: attributedRevenue.toFixed(2),
      roi,
      handoff_sla_compliance_rate: handoffSlaComplianceRate,
      median_lead_cycle_days: medianLeadCycleDays !== null ? medianLeadCycleDays.toFixed(1) : null,
      budget_vs_actual: budgetVsActual,
      has_data: true,
    };
  }
}

export = GetFunnelReportUseCase;
