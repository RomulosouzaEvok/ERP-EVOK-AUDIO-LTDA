/**
 * Caso de uso: relatório de ROI/custo por lead agregado por evento,
 * cobrindo o fluxo do endpoint `GET /api/marketing/reports/events`
 * (RF-MKT-024/027).
 *
 * @module modules/marketing/application/use-cases/report/GetEventsReportUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import EventRepository from '../../../domain/repositories/EventRepository';
import LeadRepository from '../../../domain/repositories/LeadRepository';
import SalesRevenueService from '../../services/SalesRevenueService';
import { REVENUE_ATTRIBUTION_WINDOW_DAYS } from '../../../domain/constants';

type GetEventsReportInput = {
  event_type?: string;
  date_from?: string;
  date_to?: string;
};

class GetEventsReportUseCase extends UseCase<GetEventsReportInput, any> {
  private readonly eventRepository: EventRepository;
  private readonly leadRepository: LeadRepository;
  private readonly salesRevenueService: SalesRevenueService;

  constructor(eventRepository: EventRepository, leadRepository: LeadRepository, salesRevenueService: SalesRevenueService) {
    super();
    this.eventRepository = eventRepository;
    this.leadRepository = leadRepository;
    this.salesRevenueService = salesRevenueService;
  }

  async execute({ event_type, date_from, date_to }: GetEventsReportInput = {}) {
    const { rows: events } = await this.eventRepository.listEvents(
      { event_type, date_from, date_to },
      { limit: 1000, offset: 0 },
    );

    const report = [];
    for (const event of events) {
      const leads = await this.leadRepository.findByEventId(event.id);
      const convertedLeads = leads.filter((l: any) => l.status === 'converted' && l.converted_to_customer_id);

      let attributedRevenue = 0;
      for (const lead of convertedLeads) {
        if (!lead.converted_at) continue;
        const since = new Date(lead.converted_at);
        const until = new Date(lead.converted_at);
        until.setDate(until.getDate() + REVENUE_ATTRIBUTION_WINDOW_DAYS);
        const revenue = await this.salesRevenueService.getAttributedRevenue([lead.converted_to_customer_id], since, until);
        attributedRevenue += Number(revenue);
      }

      const actualCost = event.actual_cost !== null && event.actual_cost !== undefined ? Number(event.actual_cost) : null;
      const costPerLead = actualCost !== null && leads.length > 0 ? (actualCost / leads.length).toFixed(2) : null;
      const roi = actualCost !== null && actualCost > 0 ? ((attributedRevenue - actualCost) / actualCost).toFixed(2) : null;

      report.push({
        event_id: event.id,
        name: event.name,
        actual_cost: actualCost !== null ? actualCost.toFixed(2) : null,
        leads_count: leads.length,
        conversions: convertedLeads.length,
        attributed_revenue: attributedRevenue.toFixed(2),
        cost_per_lead: costPerLead,
        roi,
      });
    }

    return report;
  }
}

export = GetEventsReportUseCase;
