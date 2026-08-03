/**
 * Caso de uso: listagem paginada de projetos de engenharia (P&D).
 *
 * @module modules/engineering/application/use-cases/ListProjectsUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import EngineeringRepository from '../../domain/repositories/EngineeringRepository';

type ListProjectsInput = {
  status?: string;
  stage?: string;
  page?: number;
  limit?: number;
  offset?: number;
};

type ListProjectsOutput = {
  rows: any[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
};

class ListProjectsUseCase extends UseCase<ListProjectsInput, ListProjectsOutput> {
  private readonly engineeringRepository: EngineeringRepository;

  constructor(engineeringRepository: EngineeringRepository) {
    super();
    this.engineeringRepository = engineeringRepository;
  }

  async execute({ status, stage, page = 1, limit = 20, offset = 0 }: ListProjectsInput = {}) {
    const { rows, count } = await this.engineeringRepository.listProjects(
      { status, stage },
      { limit, offset }
    );
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListProjectsUseCase;
