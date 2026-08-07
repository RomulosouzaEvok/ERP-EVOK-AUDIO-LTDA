/**
 * Caso de uso: listagem paginada de leads de marketing, cobrindo o fluxo do
 * endpoint `GET /api/marketing/leads`.
 *
 * BLOCO 5 MKT (correção): filtros novos — `event_id`
 * (RF-MKT-020/023, também usado por `GET /events/:id/leads`),
 * `sales_owner_user_id` (RF-MKT-011), `sla_breached` (RF-MKT-014),
 * `data_issue_flag` (saneamento §2/§3.2).
 *
 * @module modules/marketing/application/use-cases/lead/ListLeadsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LeadRepository from '../../../domain/repositories/LeadRepository';

type ListLeadsInput = {
  status?: string;
  campaign_id?: number;
  event_id?: number;
  lead_source?: string;
  sales_owner_user_id?: number;
  sla_breached?: boolean;
  data_issue_flag?: boolean;
  page?: number;
  limit?: number;
  offset?: number;
};

class ListLeadsUseCase extends UseCase<ListLeadsInput, any> {
  private readonly leadRepository: LeadRepository;

  constructor(leadRepository: LeadRepository) {
    super();
    this.leadRepository = leadRepository;
  }

  async execute({
    status, campaign_id, event_id, lead_source, sales_owner_user_id, sla_breached, data_issue_flag,
    page = 1, limit = 20, offset = 0,
  }: ListLeadsInput = {}) {
    const { rows, count } = await this.leadRepository.listLeads(
      { status, campaign_id, event_id, lead_source, sales_owner_user_id, sla_breached, data_issue_flag },
      { limit, offset },
    );
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListLeadsUseCase;
