/**
 * Caso de uso para converter ordens planejadas do MRP em Ordens de Producao
 * (OP), fechando o ciclo de planejamento para itens de fabricacao propria
 * (`items.tipo` em `SUBCONJUNTO`/`PRODUTO_ACABADO`) — complemento de
 * `ConvertPlannedOrdersToRequisitionUseCase`, que fecha o ciclo para itens
 * de compra (`MATERIA_PRIMA`).
 *
 * Regras:
 * - Todas as ordens informadas devem existir (404 caso contrario) e estar
 *   em status `RASCUNHO` ou `APROVADA` (422 `BusinessRuleError` caso
 *   contrario) — mesma janela de conversao usada pela requisicao.
 * - O item de cada ordem planejada deve ser `SUBCONJUNTO` ou
 *   `PRODUTO_ACABADO` (422 se algum item for `MATERIA_PRIMA`: esse deve ser
 *   convertido em Requisicao de Compra, nao em OP).
 * - O item deve ter um produto legado correspondente (`products`, casamento
 *   por codigo/SKU — mesma ponte dual-read de `listMrpInventoryPositions`),
 *   ativo e do tipo `finished`/`semi_finished` (422 caso contrario: bomba
 *   latente de schema documentada em docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md,
 *   sec. 3 — `production_orders.product_id` ainda e a FK obrigatoria de
 *   criacao, `item_id` e dual-write).
 * - Uma OP e criada por ordem planejada convertida (1:1, ao contrario da
 *   requisicao que agrupa N ordens em 1 cabecalho — OP nao tem conceito de
 *   "OP consolidada").
 * - Ao final, as ordens planejadas convertidas sao marcadas `EM_EXECUCAO`.
 *
 * @module modules/mrp/application/use-cases/ConvertPlannedOrdersToProductionOrderUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { BusinessRuleError, NotFoundError } from '../../../../errors';
import MrpRepository from '../../domain/repositories/MrpRepository';
import ItemRepository from '../../../items/domain/repositories/ItemRepository';

const { sequelize } = require('../../../../models/index');

/** Status de ordem planejada elegiveis para conversao em Ordem de Producao. */
const CONVERTIBLE_STATUSES = ['RASCUNHO', 'APROVADA'];

/** Tipos de item cuja necessidade e atendida por fabricacao propria (OP), nao por compra. */
const MANUFACTURING_ITEM_TYPES = ['SUBCONJUNTO', 'PRODUTO_ACABADO'];

interface ConvertPlannedOrdersToProductionOrderInput {
  planned_order_ids: string[];
  notes?: string;
  requester_id: number;
}

class ConvertPlannedOrdersToProductionOrderUseCase extends UseCase<ConvertPlannedOrdersToProductionOrderInput, any> {
  private readonly mrpRepository: MrpRepository;
  private readonly itemRepository: ItemRepository;
  private readonly productionOrderRepository: any;

  /**
   * @param mrpRepository - Repositorio de persistencia do MRP.
   * @param itemRepository - Repositorio de itens (resolve produto legado por item).
   * @param productionOrderRepository - Repositorio de Ordens de Producao.
   */
  public constructor(
    mrpRepository: MrpRepository,
    itemRepository: ItemRepository,
    productionOrderRepository: any,
  ) {
    super();
    this.mrpRepository = mrpRepository;
    this.itemRepository = itemRepository;
    this.productionOrderRepository = productionOrderRepository;
  }

  /**
   * Executa a conversao de ordens planejadas em Ordens de Producao.
   *
   * @param input - Ids das ordens planejadas, notas opcionais e id do solicitante logado.
   * @returns OPs criadas e ids das ordens planejadas convertidas.
   * @throws NotFoundError se alguma ordem planejada nao existir.
   * @throws BusinessRuleError se alguma ordem nao estiver em status convertivel,
   *   se o item nao for de fabricacao propria, ou se nao houver produto legado
   *   correspondente ativo e produzivel.
   */
  public async execute(input: ConvertPlannedOrdersToProductionOrderInput): Promise<any> {
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

      const createdOrders: any[] = [];

      for (const plannedOrder of plannedOrders) {
        const item = await this.itemRepository.findById(String(plannedOrder.item_id));
        if (!item) {
          throw new NotFoundError(`Item nao encontrado para a ordem planejada ${plannedOrder.id}: ${plannedOrder.item_id}`);
        }

        if (!MANUFACTURING_ITEM_TYPES.includes(item.tipo)) {
          throw new BusinessRuleError(
            `Item '${item.codigo}' e do tipo ${item.tipo} (compra), nao pode gerar Ordem de Producao. `
            + 'Use a conversao para Requisicao de Compra (POST /api/mrp/planned-orders/convert).',
            { planned_order_id: plannedOrder.id, item_id: item.id, item_tipo: item.tipo },
          );
        }

        const product = await this.itemRepository.findLegacyProductByItemId(String(plannedOrder.item_id));
        if (!product) {
          throw new BusinessRuleError(
            `Item '${item.codigo}' nao possui produto correspondente cadastrado (crosswalk por codigo). `
            + 'Nao e possivel gerar Ordem de Producao sem o vinculo item-produto.',
            { planned_order_id: plannedOrder.id, item_id: item.id },
          );
        }
        if (product.status !== 'active') {
          throw new BusinessRuleError(
            `Produto '${product.name}' (codigo ${item.codigo}) esta inativo e nao pode gerar Ordem de Producao.`,
            { planned_order_id: plannedOrder.id, item_id: item.id, product_id: product.id },
          );
        }
        if (product.product_type !== 'finished' && product.product_type !== 'semi_finished') {
          throw new BusinessRuleError(
            `Produto '${product.name}' (codigo ${item.codigo}) e do tipo '${product.product_type}' e nao tem OP.`,
            { planned_order_id: plannedOrder.id, item_id: item.id, product_id: product.id },
          );
        }

        const year = new Date().getFullYear();
        const yearPrefix = `OP-${year}`;
        const count = await this.productionOrderRepository.countByOrderNumberPrefix(yearPrefix, transaction);
        const order_number = `${yearPrefix}-${String(count + 1).padStart(4, '0')}`;

        const order = await this.productionOrderRepository.create({
          order_number,
          product_id: product.id,
          item_id: item.id,
          quantity: plannedOrder.quantidade_planejada,
          priority: 'normal',
          status: 'planned',
          due_date: plannedOrder.data_necessidade,
          notes: input.notes ?? `Gerada automaticamente do plano MRP (ordem planejada ${plannedOrder.id})`,
          created_by: input.requester_id,
        }, transaction);

        createdOrders.push(order);
      }

      const convertedIds = plannedOrders.map((order: any) => order.id);
      await this.mrpRepository.updatePlannedOrdersStatus(convertedIds, 'EM_EXECUCAO', transaction);

      return {
        production_orders: createdOrders,
        converted_ids: convertedIds,
      };
    });
  }
}

export = ConvertPlannedOrdersToProductionOrderUseCase;
