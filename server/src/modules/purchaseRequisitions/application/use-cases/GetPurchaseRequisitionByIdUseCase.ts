import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import PurchaseRequisitionRepository from '../../domain/repositories/PurchaseRequisitionRepository';

type GetPurchaseRequisitionByIdInput = { id: number };

class GetPurchaseRequisitionByIdUseCase extends UseCase<GetPurchaseRequisitionByIdInput, any> {
  private readonly requisitionRepository: PurchaseRequisitionRepository;

  constructor(requisitionRepository: PurchaseRequisitionRepository) {
    super();
    this.requisitionRepository = requisitionRepository;
  }

  async execute({ id }: GetPurchaseRequisitionByIdInput) {
    const requisition = await this.requisitionRepository.findRequisitionById(id);
    if (!requisition) {
      throw new NotFoundError('Requisicao nao encontrada');
    }
    return requisition;
  }
}

export = GetPurchaseRequisitionByIdUseCase;
