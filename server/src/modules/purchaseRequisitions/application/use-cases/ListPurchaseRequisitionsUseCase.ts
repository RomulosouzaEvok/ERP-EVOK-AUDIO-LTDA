import UseCase from '../../../../shared/application/UseCase';
import PurchaseRequisitionRepository from '../../domain/repositories/PurchaseRequisitionRepository';

type ListPurchaseRequisitionsInput = {
  status?: string;
  origin?: string;
  requester_id?: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
  offset?: number;
};

type ListPurchaseRequisitionsOutput = {
  rows: any[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
};

class ListPurchaseRequisitionsUseCase extends UseCase<ListPurchaseRequisitionsInput, ListPurchaseRequisitionsOutput> {
  private readonly requisitionRepository: PurchaseRequisitionRepository;

  constructor(requisitionRepository: PurchaseRequisitionRepository) {
    super();
    this.requisitionRepository = requisitionRepository;
  }

  async execute({ status, origin, requester_id, start_date, end_date, page = 1, limit = 20, offset = 0 }: ListPurchaseRequisitionsInput = {}) {
    const { rows, count } = await this.requisitionRepository.listRequisitions(
      { status, origin, requester_id, start_date, end_date },
      { limit, offset }
    );
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListPurchaseRequisitionsUseCase;
