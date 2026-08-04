import UseCase from '../../../../shared/application/UseCase';
import { calculateMrpPlan } from '../mrpEngine';
import MrpRepository from '../../domain/repositories/MrpRepository';
import ItemRepository from '../../../items/domain/repositories/ItemRepository';
import PurchaseRequisitionRepository from '../../../purchaseRequisitions/domain/repositories/PurchaseRequisitionRepository';
import ItemSupplierRepository from '../../../items/domain/repositories/ItemSupplierRepository';
import createRequisitionFromPlannedOrders from './support/createRequisitionFromPlannedOrders';
const { sequelize } = require('../../../../models/index');

/**
 * Status de ordem planejada elegiveis para conversao automatica em
 * requisicao de compra (mesma regra de `ConvertPlannedOrdersToRequisitionUseCase`).
 */
const AUTO_CONVERTIBLE_STATUSES = ['RASCUNHO', 'APROVADA'];

/**
 * Caso de uso para gerar e persistir plano MRP.
 *
 * Roadmap pos-Go-Live item 3 ("fechar o ciclo MRP"): quando o repositorio
 * de requisicoes e o de item x fornecedor sao injetados (via controller),
 * este use case tambem fecha automaticamente, na MESMA transacao do plano,
 * as ordens planejadas de itens com o opt-in `items.conversao_automatica =
 * true` — sem esperar o planejador selecionar nada na tela. Ordens de
 * itens sem a flag continuam exigindo a conversao manual existente
 * (`POST /api/mrp/planned-orders/convert`). Ver decisao completa no
 * cabecalho da migration `20260804-000010-add-mrp-auto-convert-to-items.cjs`.
 */
class GenerateMrpPlanUseCase extends UseCase<Record<string, any>, any[]> {
  private readonly mrpRepository: MrpRepository;
  private readonly itemRepository: ItemRepository;
  private readonly requisitionRepository?: PurchaseRequisitionRepository;
  private readonly itemSupplierRepository?: ItemSupplierRepository;

  /**
   * @param mrpRepository - Repositorio de persistencia do MRP.
   * @param itemRepository - Repositorio de itens (posicoes de estoque e flag de auto-conversao).
   * @param requisitionRepository - Opcional. Quando informado (junto com `itemSupplierRepository`),
   *   habilita o fechamento automatico plano -> requisicao para itens com opt-in.
   * @param itemSupplierRepository - Opcional. Ver `requisitionRepository`.
   */
  public constructor(
    mrpRepository: MrpRepository,
    itemRepository: ItemRepository,
    requisitionRepository?: PurchaseRequisitionRepository,
    itemSupplierRepository?: ItemSupplierRepository,
  ) {
    super();
    this.mrpRepository = mrpRepository;
    this.itemRepository = itemRepository;
    this.requisitionRepository = requisitionRepository;
    this.itemSupplierRepository = itemSupplierRepository;
  }

  /**
   * Gera ordens planejadas a partir de demanda manual e, para itens com
   * opt-in de conversao automatica, ja fecha o ciclo criando a Requisicao
   * de Compra correspondente na mesma transacao.
   *
   * @param input.demands - Lista de demandas (item, quantidade, data, origem).
   * @param input.requester_id - Id do usuario que disparou a geracao do plano
   *   (JWT do endpoint `POST /api/mrp/plan`); usado como `requester_id` da
   *   requisicao gerada automaticamente, quando houver.
   * @returns Ordens planejadas persistidas (inclui as convertidas automaticamente,
   *   ja com `status` refletido no banco).
   */
  public async execute(input: Record<string, any>): Promise<any[]> {
    const demands = (input.demands ?? []).map((demand: any) => ({
      itemId: String(demand.item_id),
      quantity: Number(demand.quantidade),
      dueDate: new Date(String(demand.data_necessidade)),
      sourceType: String(demand.origem),
      sourceId: demand.origem_id ?? undefined,
    }));

    const edges = await this.mrpRepository.listActiveEdges();
    const inventory = await this.itemRepository.listMrpInventoryPositions();
    const normalizedEdges = edges.map((edge: any) => ({
      parentItemId: String(edge.item_pai_id),
      componentItemId: String(edge.item_componente_id),
      quantityPer: Number(edge.quantidade),
      scrapPercentage: Number(edge.perda_percentual ?? 0),
      active: Boolean(edge.ativo),
    }));
    const normalizedInventory = inventory.map((item: any) => ({
      itemId: String(item.id),
      onHand: Number(item.estoque_atual ?? 0),
      reserved: Number(item.estoque_reservado ?? 0),
      safetyStock: Number(item.estoque_seguranca ?? 0),
      minimumLotSize: Number(item.lote_minimo ?? 0),
      leadTimeDays: Number(item.lead_time_dias ?? 0),
    }));

    const planByOrigin = new Map<string, Record<string, any>>();
    for (const demand of demands) {
      const demandPlan = calculateMrpPlan([demand], normalizedEdges, normalizedInventory);
      for (const order of demandPlan) {
        const origem = normalizeOrigem(demand.sourceType);
        const origemId = demand.sourceId ?? null;
        const key = `${order.itemId}|${order.dueDate.toISOString().slice(0, 10)}|${origem}|${origemId ?? ''}`;
        const previous = planByOrigin.get(key);
        planByOrigin.set(key, {
          item_id: order.itemId,
          origem,
          origem_id: origemId,
          necessidade_bruta: Number((previous?.necessidade_bruta ?? 0) + order.grossRequirement),
          estoque_disponivel: order.availableStock,
          necessidade_liquida: Number((previous?.necessidade_liquida ?? 0) + order.netRequirement),
          quantidade_planejada: Number((previous?.quantidade_planejada ?? 0) + order.plannedQuantity),
          data_necessidade: order.dueDate.toISOString().slice(0, 10),
          data_liberacao: order.releaseDate.toISOString().slice(0, 10),
          status: 'RASCUNHO',
        });
      }
    }

    return sequelize.transaction(async (transaction: any) => {
      const persistedOrders = await this.mrpRepository.upsertPlannedOrders(
        Array.from(planByOrigin.values()),
        transaction,
      );

      await this.autoConvertEligibleOrders(persistedOrders, input.requester_id, transaction);

      return persistedOrders;
    });
  }

  /**
   * Fecha o ciclo automatico plano -> requisicao para as ordens planejadas
   * recem-persistidas cujo item tem `conversao_automatica = true`. Roda
   * dentro da MESMA transacao do plano (rastreabilidade e atomicidade:
   * ordens so mudam para `EM_EXECUCAO` se a requisicao for criada com
   * sucesso, e vice-versa).
   *
   * Nao faz nada (no-op) se `requisitionRepository`/`itemSupplierRepository`
   * nao foram injetados no construtor — preserva 100% o comportamento
   * anterior para quem instancia este use case sem os repositorios novos.
   *
   * @param persistedOrders - Ordens planejadas ja persistidas nesta execucao.
   * @param requesterId - Id do usuario que disparou a geracao do plano (JWT).
   * @param transaction - Transacao Sequelize ativa.
   */
  private async autoConvertEligibleOrders(
    persistedOrders: any[],
    requesterId: number | undefined,
    transaction: any,
  ): Promise<void> {
    if (!this.requisitionRepository || !this.itemSupplierRepository || !requesterId) {
      return;
    }

    const candidateOrders = persistedOrders.filter(
      (order: any) => AUTO_CONVERTIBLE_STATUSES.includes(order.status),
    );
    if (!candidateOrders.length) {
      return;
    }

    const candidateItemIds = Array.from(new Set(candidateOrders.map((order: any) => String(order.item_id))));
    const autoConvertItemIds = await this.itemRepository.listAutoConvertItemIds(candidateItemIds);
    if (!autoConvertItemIds.size) {
      return;
    }

    const eligibleOrders = candidateOrders.filter((order: any) => autoConvertItemIds.has(String(order.item_id)));
    if (!eligibleOrders.length) {
      return;
    }

    await createRequisitionFromPlannedOrders({
      plannedOrders: eligibleOrders,
      requesterId: requesterId as number,
      origin: 'mrp_auto',
      notes: 'Gerada automaticamente pelo MRP (opt-in de conversao automatica do item), sem intervencao do planejador.',
      requisitionRepository: this.requisitionRepository,
      itemSupplierRepository: this.itemSupplierRepository,
      transaction,
    });

    const eligibleIds = eligibleOrders.map((order: any) => order.id);
    await this.mrpRepository.updatePlannedOrdersStatus(eligibleIds, 'EM_EXECUCAO', transaction);
  }
}

/**
 * Normaliza o tipo de origem para o enum do banco.
 * Aceita tanto o enum do Zod quanto o formato legado em ingles.
 *
 * @param sourceType - Tipo de origem da demanda.
 * @returns Valor normalizado para o enum `mrp_ordens_planejadas.origem`.
 */
function normalizeOrigem(sourceType: string): string {
  switch (sourceType) {
    case 'PEDIDO_VENDA':
    case 'sales_order':
      return 'PEDIDO_VENDA';
    case 'PREVISAO':
    case 'forecast':
      return 'PREVISAO';
    case 'ORDEM_PRODUCAO':
    case 'production_order':
      return 'ORDEM_PRODUCAO';
    default:
      return 'MANUAL';
  }
}

export = GenerateMrpPlanUseCase;
