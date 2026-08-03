import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import ItemRepository from '../../../items/domain/repositories/ItemRepository';
import PurchaseRequisitionRepository from '../../domain/repositories/PurchaseRequisitionRepository';

class CreatePurchaseRequisitionUseCase extends UseCase<Record<string, any>, any> {
  private readonly requisitionRepository: PurchaseRequisitionRepository;
  private readonly itemRepository: ItemRepository;

  constructor(requisitionRepository: PurchaseRequisitionRepository, itemRepository: ItemRepository) {
    super();
    this.requisitionRepository = requisitionRepository;
    this.itemRepository = itemRepository;
  }

  async execute(input: Record<string, any>): Promise<any> {
    const requisition = await this.requisitionRepository.createRequisition({
      requisition_number: `RQ-${Date.now()}`,
      requester_id: input.requester_id,
      department_id: input.department_id ?? null,
      production_order_id: input.production_order_id ?? null,
      request_date: input.request_date ?? new Date(),
      priority: input.priority ?? 'normal',
      status: input.status ?? 'pending',
      origin: input.origin ?? 'manual',
      // Aprovacao nunca nasce no create: exige fluxo proprio de aprovacao.
      approved_by: null,
      approval_date: null,
      notes: input.notes ?? null,
    }, input.transaction);

    for (const item of input.items ?? []) {
      const existingItem = await this.itemRepository.findById(String(item.item_id));
      if (!existingItem) {
        throw new NotFoundError(`Item ${item.item_id} nao encontrado`);
      }

      await this.requisitionRepository.createRequisitionItem({
        requisition_id: requisition.id,
        item_id: item.item_id,
        quantity: item.quantity,
        unit: item.unit ?? null,
        required_date: item.required_date ?? null,
        suggested_supplier_id: item.suggested_supplier_id ?? null,
        unit_price_estimated: item.unit_price_estimated ?? null,
        status: item.status ?? 'pending',
        notes: item.notes ?? null,
      }, input.transaction);
    }

    return this.requisitionRepository.findRequisitionById(requisition.id, input.transaction);
  }
}

export = CreatePurchaseRequisitionUseCase;

