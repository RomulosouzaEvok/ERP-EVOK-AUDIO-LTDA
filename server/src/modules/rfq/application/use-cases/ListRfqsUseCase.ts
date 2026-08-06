/**
 * Lista cotacoes (RFQ) com filtros e paginacao, cobrindo o endpoint
 * `GET /api/rfqs`.
 *
 * @module modules/rfq/application/use-cases/ListRfqsUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import RfqRepository from '../../domain/repositories/RfqRepository';

interface ListRfqsInput {
  status?: string;
  requisition_id?: number;
  page?: number;
  limit?: number;
  offset?: number;
}

interface ListRfqsOutput {
  rows: any[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

class ListRfqsUseCase extends UseCase<ListRfqsInput, ListRfqsOutput> {
  private readonly rfqRepository: RfqRepository;

  public constructor(rfqRepository: RfqRepository) {
    super();
    this.rfqRepository = rfqRepository;
  }

  public async execute({ status, requisition_id, page = 1, limit = 20, offset = 0 }: ListRfqsInput = {}): Promise<ListRfqsOutput> {
    const { rows, count } = await this.rfqRepository.listRfqs({ status, requisition_id }, { limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListRfqsUseCase;
