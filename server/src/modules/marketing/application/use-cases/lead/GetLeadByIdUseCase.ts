/**
 * Caso de uso: busca de um lead de marketing por id, cobrindo o fluxo do
 * endpoint `GET /api/marketing/leads/:id`.
 *
 * @module modules/marketing/application/use-cases/lead/GetLeadByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import LeadRepository from '../../../domain/repositories/LeadRepository';

type GetLeadByIdInput = { id: number };

class GetLeadByIdUseCase extends UseCase<GetLeadByIdInput, any> {
  private readonly leadRepository: LeadRepository;

  constructor(leadRepository: LeadRepository) {
    super();
    this.leadRepository = leadRepository;
  }

  async execute({ id }: GetLeadByIdInput) {
    const lead = await this.leadRepository.findLeadById(id);
    if (!lead) {
      throw new NotFoundError('Lead não encontrado.');
    }
    return lead;
  }
}

export = GetLeadByIdUseCase;
