/**
 * Lista processos de importacao com filtros e paginacao, cobrindo o
 * endpoint `GET /api/comex/import-processes`.
 *
 * @module modules/comex/application/use-cases/ListImportProcessesUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import ComexRepository from '../../domain/repositories/ComexRepository';

interface ListImportProcessesInput {
  status?: string;
  supplier_id?: number;
  page?: number;
  limit?: number;
  offset?: number;
}

interface ListImportProcessesOutput {
  rows: any[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

class ListImportProcessesUseCase extends UseCase<ListImportProcessesInput, ListImportProcessesOutput> {
  private readonly comexRepository: ComexRepository;

  public constructor(comexRepository: ComexRepository) {
    super();
    this.comexRepository = comexRepository;
  }

  public async execute({ status, supplier_id, page = 1, limit = 20, offset = 0 }: ListImportProcessesInput = {}): Promise<ListImportProcessesOutput> {
    const { rows, count } = await this.comexRepository.listImportProcesses({ status, supplier_id }, { limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListImportProcessesUseCase;
