/**
 * `GET /api/rh/termination-processes` — filtros `status`/`payment_deadline_at_risk`.
 * @module modules/rh/application/use-cases/termination/ListTerminationProcessesUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import TerminationProcessRepository from '../../../domain/repositories/TerminationProcessRepository';

class ListTerminationProcessesUseCase extends UseCase<Record<string, any>, any> {
  private readonly repository: TerminationProcessRepository;

  public constructor(repository: TerminationProcessRepository) {
    super();
    this.repository = repository;
  }

  public async execute(filters: Record<string, any>): Promise<any> {
    const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
    const limit = Number(filters.limit) > 0 ? Number(filters.limit) : 20;
    const { count, rows } = await this.repository.findAndCount(filters, { limit, offset: (page - 1) * limit });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListTerminationProcessesUseCase;
