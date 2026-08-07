/**
 * Caso de uso: atualização de dados cadastrais de um lead de marketing
 * (nome, contato, campanha, etc.), cobrindo o fluxo do endpoint
 * `PUT /api/marketing/leads/:id`. NÃO altera `status` — o funil é um caso
 * de uso dedicado, ver `ChangeLeadStatusUseCase`.
 *
 * @module modules/marketing/application/use-cases/lead/UpdateLeadUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import LeadRepository from '../../../domain/repositories/LeadRepository';

type UpdateLeadInput = { id: number } & Record<string, any>;

class UpdateLeadUseCase extends UseCase<UpdateLeadInput, any> {
  private readonly leadRepository: LeadRepository;

  constructor(leadRepository: LeadRepository) {
    super();
    this.leadRepository = leadRepository;
  }

  /**
   * @throws {NotFoundError} Se o lead não existir.
   */
  async execute({ id, ...rest }: UpdateLeadInput) {
    const current = await this.leadRepository.findLeadById(id);
    if (!current) {
      throw new NotFoundError('Lead não encontrado.');
    }

    return this.leadRepository.updateLead(id, rest);
  }
}

export = UpdateLeadUseCase;
