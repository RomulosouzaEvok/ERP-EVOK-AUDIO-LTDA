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
 * Status de ordem planejada que **ainda nao viraram requisicao**. Uma ordem
 * fora desta lista ja passou pela conversao (`EM_EXECUCAO`) ou saiu do jogo
 * (`CONCLUIDA`/`CANCELADA`) — converter de novo e compra duplicada.
 */
const PENDING_CONVERSION_STATUSES = ['RASCUNHO', 'APROVADA'];

/**
 * Cria a requisicao de compra (status `pending`) e um item de requisicao
 * por ordem planejada, sugerindo o fornecedor preferencial ativo do item
 * (quando existir) com o preco de referencia do vinculo.
 *
 * ## Idempotencia (defeito CRITICO 2 da auditoria de 2026-08-11)
 *
 * Antes, este helper criava cabecalho e itens novos a CADA chamada, sem
 * olhar o estado das ordens. Combinado com o upsert do MRP — que rebaixava
 * ordens convertidas de volta para `RASCUNHO` a cada rodada do plano — o
 * resultado era uma requisicao de compra nova por rodada, para o mesmo
 * material, descoberta so no recebimento.
 *
 * Duas defesas, ambas baratas:
 * 1. **status como marca de conversao** — ordem que ja saiu de
 *    `RASCUNHO`/`APROVADA` e ignorada aqui, mesmo que o chamador insista;
 * 2. **deduplicacao por id** — a mesma ordem repetida no lote vira um item
 *    de requisicao so.
 *
 * Se nada sobrar, **nenhuma requisicao e criada** e o retorno e `null` — um
 * cabecalho vazio seria um documento de compra sem item, que so polui a fila
 * de aprovacao de Suprimentos.
 *
 * @param params - Ordens planejadas, identidade do solicitante, origem,
 *   notas, repositorios e a transacao Sequelize ativa.
 * @returns A requisicao de compra criada (retorno "cru" do repositorio,
 *   sem includes — o chamador decide se precisa recarregar com
 *   `findRequisitionById`), ou `null` quando nao havia ordem convertivel.
 */
async function createRequisitionFromPlannedOrders(
  params: CreateRequisitionFromPlannedOrdersParams,
): Promise<any | null> {
  const {
    plannedOrders, requesterId, origin, notes,
    requisitionRepository, itemSupplierRepository, transaction,
  } = params;

  const seenOrderIds = new Set<string>();
  const convertibleOrders = plannedOrders.filter((order: any) => {
    if (!PENDING_CONVERSION_STATUSES.includes(String(order.status))) {
      return false;
    }
    const orderId = String(order.id ?? '');
    if (orderId && seenOrderIds.has(orderId)) {
      return false;
    }
    if (orderId) {
      seenOrderIds.add(orderId);
    }
    return true;
  });

  if (!convertibleOrders.length) {
    return null;
  }

  const yearPrefix = `RQ-${new Date().getFullYear()}`;
  const requisitionNumber = await requisitionRepository.nextRequisitionNumberForYear(yearPrefix, transaction);

  const requisition = await requisitionRepository.createRequisition({
    requisition_number: requisitionNumber,
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

  for (const order of convertibleOrders) {
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
