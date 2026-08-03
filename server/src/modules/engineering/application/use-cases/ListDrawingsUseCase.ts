/**
 * Caso de uso: listagem paginada de desenhos tecnicos.
 *
 * @module modules/engineering/application/use-cases/ListDrawingsUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import EngineeringRepository from '../../domain/repositories/EngineeringRepository';

type ListDrawingsInput = {
  product_id?: number;
  status?: string;
  page?: number;
  limit?: number;
  offset?: number;
};

type ListDrawingsOutput = {
  rows: any[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
};

class ListDrawingsUseCase extends UseCase<ListDrawingsInput, ListDrawingsOutput> {
  private readonly engineeringRepository: EngineeringRepository;

  constructor(engineeringRepository: EngineeringRepository) {
    super();
    this.engineeringRepository = engineeringRepository;
  }

  async execute({ product_id, status, page = 1, limit = 20, offset = 0 }: ListDrawingsInput = {}) {
    const { rows, count } = await this.engineeringRepository.listDrawings(
      { product_id, status },
      { limit, offset }
    );
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListDrawingsUseCase;
