/**
 * Caso de uso: listagem paginada de leads de marketing, cobrindo o fluxo do
 * endpoint `GET /api/marketing/leads`.
 *
 * @module modules/marketing/application/use-cases/lead/ListLeadsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LeadRepository from '../../../domain/repositories/LeadRepository';

type ListLeadsInput = {
  status?: string;
  campaign_id?: number;
  lead_source?: string;
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

  async execute({ status, campaign_id, lead_source, page = 1, limit = 20, offset = 0 }: ListLeadsInput = {}) {
    const { rows, count } = await this.leadRepository.listLeads({ status, campaign_id, lead_source }, { limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListLeadsUseCase;
