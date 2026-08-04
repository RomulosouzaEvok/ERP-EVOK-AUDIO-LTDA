import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import ItemRepository from '../../../items/domain/repositories/ItemRepository';
import PurchaseRequisitionRepository from '../../domain/repositories/PurchaseRequisitionRepository';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { EngineeringProject } = require('../../../../models/index');

class CreatePurchaseRequisitionUseCase extends UseCase<Record<string, any>, any> {
  private readonly requisitionRepository: PurchaseRequisitionRepository;
  private readonly itemRepository: ItemRepository;

  constructor(requisitionRepository: PurchaseRequisitionRepository, itemRepository: ItemRepository) {
    super();
    this.requisitionRepository = requisitionRepository;
    this.itemRepository = itemRepository;
  }

  /**
   * Cria uma requisicao de compra com seus itens.
   *
   * Bloco 2 (UC-39, BUSINESS_RULES.md §9): `origin='engenharia_amostra'`
   * reaproveita 100% este mesmo fluxo de criacao — nenhuma maquina de
   * estados nova. `engineering_project_id` e sempre opcional (mesmo para
   * amostra de engenharia); quando informado, valida a existencia do
   * projeto antes de criar a requisicao (404 didatico), para qualquer
   * `origin`.
   *
   * @param input - Payload validado pelo controller (`createPurchaseRequisitionSchema`) + `requester_id`/`transaction` injetados.
   * @returns A requisicao criada, com itens e relacionamentos carregados.
   * @throws {NotFoundError} Se `engineering_project_id` for informado e nao corresponder a um projeto existente, ou se algum `item_id` nao existir.
   */
  async execute(input: Record<string, any>): Promise<any> {
    if (input.engineering_project_id) {
      const project = await EngineeringProject.findByPk(input.engineering_project_id, {
        transaction: input.transaction,
      });
      if (!project) {
        throw new NotFoundError(`Projeto de engenharia ${input.engineering_project_id} nao encontrado.`);
      }
    }

    const requisition = await this.requisitionRepository.createRequisition({
      requisition_number: `RQ-${Date.now()}`,
      requester_id: input.requester_id,
      department_id: input.department_id ?? null,
      production_order_id: input.production_order_id ?? null,
      engineering_project_id: input.engineering_project_id ?? null,
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

