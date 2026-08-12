/**
 * `GET /api/rh/time-imports/:id` — detalhe do lote com itens (funcionário
 * casado, quando houver) e a lista de não-casados destacada.
 *
 * @module modules/rh/application/use-cases/timeImport/GetTimeImportBatchUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import TimeImportRepository from '../../../domain/repositories/TimeImportRepository';

interface GetTimeImportBatchInput {
  id: number | string;
}

class GetTimeImportBatchUseCase extends UseCase<GetTimeImportBatchInput, any> {
  private readonly repository: TimeImportRepository;

  public constructor(repository: TimeImportRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} lote inexistente (404). */
  public async execute(input: GetTimeImportBatchInput): Promise<any> {
    const batch = await this.repository.findBatchById(input.id);
    if (!batch) throw new NotFoundError('Lote de importação de ponto não encontrado.');

    const unmatched = await this.repository.listUnmatchedItemsByBatch(input.id);

    return { batch, unmatched };
  }
}

export = GetTimeImportBatchUseCase;
