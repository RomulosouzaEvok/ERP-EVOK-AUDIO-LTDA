/**
 * Caso de uso para converter ordens planejadas do MRP em uma unica
 * Requisicao de Compra, fechando o ciclo planejamento -> suprimentos.
 *
 * Regras:
 * - Todas as ordens informadas devem existir (404 caso contrario) e estar
 *   em status `RASCUNHO` ou `APROVADA` (422 `BusinessRuleError` caso contrario).
 * - Uma unica requisicao e criada, com um item de requisicao por ordem
 *   planejada convertida.
 * - O fornecedor preferencial ativo do item (quando existir) e sugerido
 *   automaticamente, junto com o preco unitario de referencia do vinculo.
 * - Ao final, as ordens planejadas convertidas sao marcadas `EM_EXECUCAO`.
 *
 * @module modules/mrp/application/use-cases/ConvertPlannedOrdersToRequisitionUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { BusinessRuleError, NotFoundError } from '../../../../errors';
import MrpRepository from '../../domain/repositories/MrpRepository';
import PurchaseRequisitionRepository from '../../../purchaseRequisitions/domain/repositories/PurchaseRequisitionRepository';
import ItemSupplierRepository from '../../../items/domain/repositories/ItemSupplierRepository';

const { sequelize } = require('../../../../models/index');

/** Status de ordem planejada elegiveis para conversao em requisicao de compra. */
const CONVERTIBLE_STATUSES = ['RASCUNHO', 'APROVADA'];

interface ConvertPlannedOrdersInput {
  planned_order_ids: string[];
  notes?: string;
  requester_id: number;
}

class ConvertPlannedOrdersToRequisitionUseCase extends UseCase<ConvertPlannedOrdersInput, any> {
  private readonly mrpRepository: MrpRepository;
  private readonly requisitionRepository: PurchaseRequisitionRepository;
  private readonly itemSupplierRepository: ItemSupplierRepository;

  public constructor(
    mrpRepository: MrpRepository,
    requisitionRepository: PurchaseRequisitionRepository,
    itemSupplierRepository: ItemSupplierRepository,
  ) {
    super();
    this.mrpRepository = mrpRepository;
    this.requisitionRepository = requisitionRepository;
    this.itemSupplierRepository = itemSupplierRepository;
  }

  /**
   * Executa a conversao de ordens planejadas em requisicao de compra.
   *
   * @param input - Ids das ordens planejadas, notas opcionais e id do solicitante logado.
   * @returns Requisicao de compra criada (completa) e ids das ordens convertidas.
   * @throws NotFoundError se alguma ordem planejada nao existir.
   * @throws BusinessRuleError se alguma ordem nao estiver em status convertivel.
   */
  public async execute(input: ConvertPlannedOrdersInput): Promise<any> {
    const uniqueIds = Array.from(new Set(input.planned_order_ids));

    return sequelize.transaction(async (transaction: any) => {
      const plannedOrders = await this.mrpRepository.findPlannedOrdersByIdsForUpdate(uniqueIds, transaction);

      const foundIds = new Set(plannedOrders.map((order: any) => order.id));
      const missingIds = uniqueIds.filter((id) => !foundIds.has(id));
      if (missingIds.length > 0) {
        throw new NotFoundError(`Ordens planejadas nao encontradas: ${missingIds.join(', ')}`);
      }

      const invalidOrders = plannedOrders.filter((order: any) => !CONVERTIBLE_STATUSES.includes(order.status));
      if (invalidOrders.length > 0) {
        const invalidIds = invalidOrders.map((order: any) => order.id).join(', ');
        throw new BusinessRuleError(
          `Ordens planejadas com status invalido para conversao (esperado RASCUNHO ou APROVADA): ${invalidIds}`,
          { invalid_ids: invalidOrders.map((order: any) => order.id) },
        );
      }

      const requisition = await this.requisitionRepository.createRequisition({
        requisition_number: `RQ-${Date.now()}`,
        requester_id: input.requester_id,
        department_id: null,
        production_order_id: null,
        request_date: new Date(),
        priority: 'normal',
        status: 'pending',
        origin: 'mrp',
        approved_by: null,
        approval_date: null,
        notes: input.notes ?? 'Gerada automaticamente do plano MRP',
      }, transaction);

      for (const order of plannedOrders) {
        const preferredSupplierLink = await this.itemSupplierRepository.findPreferredByItem(String(order.item_id));

        await this.requisitionRepository.createRequisitionItem({
          requisition_id: requisition.id,
          item_id: order.item_id,
          quantity: order.quantidade_planejada,
          unit: null,
          required_date: order.data_necessidade,
          suggested_supplier_id: preferredSupplierLink?.supplier_id ?? null,
          unit_price_estimated: preferredSupplierLink?.unit_price ?? null,
          status: 'pending',
          notes: null,
        }, transaction);
      }

      await this.mrpRepository.updatePlannedOrdersStatus(uniqueIds, 'EM_EXECUCAO', transaction);

      const fullRequisition = await this.requisitionRepository.findRequisitionById(requisition.id, transaction);

      return {
        requisition: fullRequisition,
        converted_ids: uniqueIds,
      };
    });
  }
}

export = ConvertPlannedOrdersToRequisitionUseCase;
