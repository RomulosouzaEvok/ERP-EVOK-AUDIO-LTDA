/**
 * Caso de uso: listagem paginada de riscos corporativos, cobrindo
 * `GET /api/directorate/business-risks`.
 *
 * @module modules/directorate/application/use-cases/business-risk/ListBusinessRisksUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import DirectorateRepository from '../../../domain/repositories/DirectorateRepository';

type ListBusinessRisksInput = {
  status?: string;
  risk_category?: string;
  page?: number;
  limit?: number;
  offset: number;
};

class ListBusinessRisksUseCase extends UseCase<ListBusinessRisksInput, any> {
  private readonly directorateRepository: DirectorateRepository;

  constructor(directorateRepository: DirectorateRepository) {
    super();
    this.directorateRepository = directorateRepository;
  }

  async execute(input: ListBusinessRisksInput) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 100;

    const { rows, count } = await this.directorateRepository.listBusinessRisks(
      { status: input.status, risk_category: input.risk_category },
      { limit, offset: input.offset },
    );

    return { rows, count, page, limit, totalPages: Math.max(1, Math.ceil(count / limit)) };
  }
}

export = ListBusinessRisksUseCase;
