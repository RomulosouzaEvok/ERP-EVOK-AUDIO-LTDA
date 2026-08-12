/**
 * `GET /api/rh/time-imports` — lista lotes de importação de ponto,
 * paginado, com filtros `status`/`competencia` (`YYYY-MM`).
 *
 * @module modules/rh/application/use-cases/timeImport/ListTimeImportBatchesUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import TimeImportRepository from '../../../domain/repositories/TimeImportRepository';

interface ListTimeImportBatchesInput {
  status?: string;
  competencia?: string;
  page?: number;
  limit?: number;
}

class ListTimeImportBatchesUseCase extends UseCase<ListTimeImportBatchesInput, any> {
  private readonly repository: TimeImportRepository;

  public constructor(repository: TimeImportRepository) {
    super();
    this.repository = repository;
  }

  public async execute(input: ListTimeImportBatchesInput): Promise<any> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const { count, rows } = await this.repository.findAndCountBatches(
      { status: input.status, competencia: input.competencia },
      { limit, offset: (page - 1) * limit },
    );
    return { count, rows, page, limit, totalPages: Math.ceil(count / limit) || 1 };
  }
}

export = ListTimeImportBatchesUseCase;
