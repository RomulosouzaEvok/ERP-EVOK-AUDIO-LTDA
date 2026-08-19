import UseCase from '../../../../shared/application/UseCase';
import { calculateMrpPlan } from '../mrpEngine';
import {
  allocateOrderToOrigins,
  buildOriginSharesByRequirement,
  keyOfPlannedOrder,
  NormalizedDemand,
} from './support/allocatePlanByOrigin';
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
const PLAN_VISIBILITY_FIELDS = ['estoque_fisico', 'estoque_retido_qualidade'] as const;

function planLineKey(order: Record<string, any>): string {
  return `${order.item_id}|${String(order.data_necessidade).slice(0, 10)}|${order.origem}|${order.origem_id ?? ''}`;
}

function readOrderField(order: any, field: string): any {
  if (typeof order.get === 'function') {
    return order.get(field);
  }
  return order[field];
}

function persistedOrderKey(order: any): string {
  return planLineKey({
    item_id: readOrderField(order, 'item_id'),
    data_necessidade: readOrderField(order, 'data_necessidade'),
    origem: readOrderField(order, 'origem'),
    origem_id: readOrderField(order, 'origem_id'),
  });
}

function stripVirtualPlanFields(order: Record<string, any>): Record<string, any> {
  const copy = { ...order };
  for (const field of PLAN_VISIBILITY_FIELDS) {
    delete copy[field];
  }
  return copy;
}

function attachPlanVisibilityFields(order: any, metadata: Record<string, any>): void {
  for (const field of PLAN_VISIBILITY_FIELDS) {
    if (typeof order.setDataValue === 'function') {
      order.setDataValue(field, metadata[field]);
    } else {
      order[field] = metadata[field];
    }
  }
}

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
   * A netagem e CONJUNTA: todas as demandas disputam a mesma posicao de
   * estoque (uma unica passagem pelo motor), e a necessidade liquida
   * resultante e rateada por origem para preservar `origem`/`origem_id`.
   *
   * @param input.demands - Lista de demandas (item, quantidade, data, origem).
   * @param input.requester_id - Id do usuario que disparou a geracao do plano
   *   (JWT do endpoint `POST /api/mrp/plan`); usado como `requester_id` da
   *   requisicao gerada automaticamente, quando houver.
   * @returns Ordens planejadas persistidas (inclui as convertidas automaticamente,
   *   ja com `status` refletido no banco).
   */
  public async execute(input: Record<string, any>): Promise<any[]> {
    const demands: NormalizedDemand[] = (input.demands ?? []).map((demand: any) => ({
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
      physicalStock: Number(item.estoque_fisico ?? item.estoque_atual ?? 0),
      qualityWithheldStock: Number(item.estoque_retido_qualidade ?? 0),
    }));

    // ATENCAO — netagem CONJUNTA (correcao do defeito CRITICO 1 da auditoria
    // de 2026-08-11). Ate aqui este trecho chamava `calculateMrpPlan` uma vez
    // POR demanda, sempre com a posicao de estoque integra: cada demanda
    // abatia o estoque inteiro, como se fosse a unica da fabrica. Duas
    // demandas de 100 contra 100 em estoque davam necessidade liquida ZERO
    // nas duas (o motor filtra `plannedQuantity > 0`) e o plano voltava
    // vazio — **a fabrica comprava a menos e so descobria na linha**.
    //
    // O motor sempre soube agregar varias demandas (mrpEngine.ts). Agora ele
    // neta UMA vez sobre a demanda inteira, e o rateio por origem
    // (`allocatePlanByOrigin`) devolve a rastreabilidade `origem`/`origem_id`
    // que motivou o laco antigo — sem tocar na conta de compra.
    const aggregatedPlan = calculateMrpPlan(demands, normalizedEdges, normalizedInventory);
    const originShares = buildOriginSharesByRequirement(demands, normalizedEdges);

    const planByOrigin = new Map<string, Record<string, any>>();
    for (const order of aggregatedPlan) {
      const allocations = allocateOrderToOrigins(order, originShares.get(keyOfPlannedOrder(order)) ?? []);

      for (const allocation of allocations) {
        // A chave de persistencia usa a data SEM hora, espelhando o indice
        // unico `uq_mrp_sem_duplicidade` (item, origem, origem_id, data).
        const key = `${order.itemId}|${order.dueDate.toISOString().slice(0, 10)}|${allocation.origem}|${allocation.origemId ?? ''}`;
        const previous = planByOrigin.get(key);
        planByOrigin.set(key, {
          item_id: order.itemId,
          origem: allocation.origem,
          origem_id: allocation.origemId,
          necessidade_bruta: Number((previous?.necessidade_bruta ?? 0) + allocation.grossRequirement),
          estoque_fisico: Number((previous?.estoque_fisico ?? 0) + allocation.physicalStock),
          estoque_retido_qualidade: Number((previous?.estoque_retido_qualidade ?? 0) + allocation.qualityWithheldStock),
          estoque_disponivel: Number((previous?.estoque_disponivel ?? 0) + allocation.availableStock),
          necessidade_liquida: Number((previous?.necessidade_liquida ?? 0) + allocation.netRequirement),
          quantidade_planejada: Number((previous?.quantidade_planejada ?? 0) + allocation.plannedQuantity),
          data_necessidade: order.dueDate.toISOString().slice(0, 10),
          data_liberacao: order.releaseDate.toISOString().slice(0, 10),
          // `status` so vale para linha NOVA: o upsert do repositorio nao
          // reescreve o status de uma ordem que ja existe (ver
          // `SequelizeMrpRepository.upsertPlannedOrders`).
          status: 'RASCUNHO',
        });
      }
    }

    return sequelize.transaction(async (transaction: any) => {
      const planRows = Array.from(planByOrigin.values());
      const planMetadata = new Map(planRows.map((order) => [planLineKey(order), order]));
      const persistedOrders = await this.mrpRepository.upsertPlannedOrders(
        planRows.map(stripVirtualPlanFields),
        transaction,
      );

      await this.autoConvertEligibleOrders(persistedOrders, input.requester_id, transaction);

      for (const order of persistedOrders) {
        const metadata = planMetadata.get(persistedOrderKey(order));
        if (metadata) {
          attachPlanVisibilityFields(order, metadata);
        }
      }

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

    const requisition = await createRequisitionFromPlannedOrders({
      plannedOrders: eligibleOrders,
      requesterId: requesterId as number,
      origin: 'mrp_auto',
      notes: 'Gerada automaticamente pelo MRP (opt-in de conversao automatica do item), sem intervencao do planejador.',
      requisitionRepository: this.requisitionRepository,
      itemSupplierRepository: this.itemSupplierRepository,
      transaction,
    });

    // `null` = nenhuma ordem elegivel restou depois do filtro de idempotencia
    // do helper (todas ja tinham virado requisicao). Nada a promover.
    if (!requisition) {
      return;
    }

    const eligibleIds = eligibleOrders.map((order: any) => order.id);
    await this.mrpRepository.updatePlannedOrdersStatus(eligibleIds, 'EM_EXECUCAO', transaction);

    // O UPDATE acima e por `where id in (...)`: as instancias ja carregadas
    // continuariam dizendo `RASCUNHO`. Isso nao era so cosmetica — o
    // controller decide gravar o audit log de conversao automatica olhando
    // `order.status === 'EM_EXECUCAO'` NESTE retorno, entao o registro de
    // auditoria da conversao automatica simplesmente nunca era escrito, e a
    // API devolvia um status que nao era o do banco.
    for (const order of eligibleOrders) {
      if (typeof order.set === 'function') {
        order.set('status', 'EM_EXECUCAO');
      } else {
        order.status = 'EM_EXECUCAO';
      }
    }
  }
}

export = GenerateMrpPlanUseCase;
