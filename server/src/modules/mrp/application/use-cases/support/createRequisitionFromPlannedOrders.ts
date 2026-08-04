/**
 * Helper compartilhado: cria uma Requisicao de Compra (cabecalho + itens) a
 * partir de um lote de ordens planejadas do MRP, dentro de uma transacao
 * ja aberta pelo chamador.
 *
 * Usado tanto pela conversao manual (`ConvertPlannedOrdersToRequisitionUseCase`,
 * planejador seleciona ordens na tela) quanto pela conversao automatica
 * (`GenerateMrpPlanUseCase`, opt-in por item via `items.conversao_automatica`)
 * para evitar duplicar a regra de sugestao de fornecedor preferencial.
 *
 * @module modules/mrp/application/use-cases/support/createRequisitionFromPlannedOrders
 */

import PurchaseRequisitionRepository from '../../../../purchaseRequisitions/domain/repositories/PurchaseRequisitionRepository';
import ItemSupplierRepository from '../../../../items/domain/repositories/ItemSupplierRepository';

interface CreateRequisitionFromPlannedOrdersParams {
  plannedOrders: any[];
  requesterId: number;
  origin: string;
  notes: string;
  requisitionRepository: PurchaseRequisitionRepository;
  itemSupplierRepository: ItemSupplierRepository;
  transaction: any;
}

/**
 * Cria a requisicao de compra (status `pending`) e um item de requisicao
 * por ordem planejada, sugerindo o fornecedor preferencial ativo do item
 * (quando existir) com o preco de referencia do vinculo.
 *
 * @param params - Ordens planejadas, identidade do solicitante, origem,
 *   notas, repositorios e a transacao Sequelize ativa.
 * @returns A requisicao de compra criada (retorno "cru" do repositorio,
 *   sem includes — o chamador decide se precisa recarregar com
 *   `findRequisitionById`).
 */
async function createRequisitionFromPlannedOrders(
  params: CreateRequisitionFromPlannedOrdersParams,
): Promise<any> {
  const {
    plannedOrders, requesterId, origin, notes,
    requisitionRepository, itemSupplierRepository, transaction,
  } = params;

  const requisition = await requisitionRepository.createRequisition({
    requisition_number: `RQ-${Date.now()}`,
    requester_id: requesterId,
    department_id: null,
    production_order_id: null,
    request_date: new Date(),
    priority: 'normal',
    status: 'pending',
    origin,
    approved_by: null,
    approval_date: null,
    notes,
  }, transaction);

  for (const order of plannedOrders) {
    const preferredSupplierLink = await itemSupplierRepository.findPreferredByItem(String(order.item_id));

    await requisitionRepository.createRequisitionItem({
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

  return requisition;
}

export = createRequisitionFromPlannedOrders;
