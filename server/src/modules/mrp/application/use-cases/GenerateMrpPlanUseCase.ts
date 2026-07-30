import UseCase from '../../../../shared/application/UseCase';
import { calculateMrpPlan } from '../mrpEngine';
import MrpRepository from '../../domain/repositories/MrpRepository';
import ItemRepository from '../../../items/domain/repositories/ItemRepository';
const { sequelize } = require('../../../../models/index');

/**
 * Caso de uso para gerar e persistir plano MRP.
 */
class GenerateMrpPlanUseCase extends UseCase<Record<string, any>, any[]> {
  private readonly mrpRepository: MrpRepository;
  private readonly itemRepository: ItemRepository;

  public constructor(mrpRepository: MrpRepository, itemRepository: ItemRepository) {
    super();
    this.mrpRepository = mrpRepository;
    this.itemRepository = itemRepository;
  }

  /** Gera ordens planejadas a partir de demanda manual. */
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

    return sequelize.transaction(async (transaction: any) => this.mrpRepository.upsertPlannedOrders(
      Array.from(planByOrigin.values()),
      transaction,
    ));
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
