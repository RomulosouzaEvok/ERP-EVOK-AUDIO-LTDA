/**
 * Implementacao Sequelize do repositorio de OP.
 *
 * @module modules/production/infrastructure/sequelize/SequelizeProductionOrderRepository
 */

import { Op, QueryTypes } from 'sequelize';
import ProductionOrderRepository from '../../domain/repositories/ProductionOrderRepository';
const { ProductionOrder, Product, Employee, User, ProductionOrderTracking, ProductionRoute, ProductionRouteStep, WorkCenter, Item, ProductionOrderReservation, sequelize }: any = require('../../../../models/index');

/**
 * Namespace (`classid`) do advisory lock que serializa a geracao do numero
 * de OP por ano. Valor arbitrario porem fixo: dois processos so competem
 * pelo lock se usarem o MESMO par (classid, ano) — nao colide com locks de
 * outras rotinas do sistema.
 */
const ORDER_NUMBER_LOCK_CLASS_ID = 41001;

class SequelizeProductionOrderRepository extends ProductionOrderRepository {
  /**
   * Lista OPs com filtros, includes e totais de resumo.
   *
   * @param filters - Filtros e paginacao.
   * @returns Linhas, contagem e totais.
   */
  public async list(filters: any): Promise<any> {
    const { status, product_id, priority, start_date, end_date, limit, offset } = filters;
    const where: any = {};
    if (status) where.status = status;
    if (product_id) where.product_id = product_id;
    if (priority) where.priority = priority;
    if (start_date || end_date) {
      where.createdAt = {};
      if (start_date) where.createdAt[Op.gte] = new Date(start_date);
      if (end_date) where.createdAt[Op.lte] = new Date(end_date);
    }

    const { count, rows } = await ProductionOrder.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code', 'product_type'] },
        { model: Employee, as: 'responsible', attributes: ['id', 'name'] },
        { model: Item, as: 'item', attributes: ['id', 'codigo', 'descricao'] }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const totals = await Promise.all([
      ProductionOrder.count(),
      ProductionOrder.count({ where: { status: 'planned' } }),
      ProductionOrder.count({ where: { status: 'in_progress' } }),
      ProductionOrder.count({ where: { status: 'completed' } }),
      ProductionOrder.count({ where: { due_date: { [Op.lt]: new Date() }, status: { [Op.notIn]: ['completed', 'canceled'] } } })
    ]);

    return { rows, count, totals };
  }

  /** @param id - ID da OP. @returns OP com includes ou null. */
  public async findById(id: number): Promise<any | null> {
    return ProductionOrder.findByPk(id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code', 'product_type'] },
        { model: Employee, as: 'responsible', attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['id', 'name'] },
        { model: Item, as: 'item', attributes: ['id', 'codigo', 'descricao'] }
      ]
    });
  }

  /** @param id - ID da OP. @returns OP com resumo do produto ou null. */
  public async findByIdWithProductSummary(id: number): Promise<any | null> {
    return ProductionOrder.findByPk(id, {
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }]
    });
  }

  /** @param id - ID da OP. @returns OP sem includes ou null. */
  public async findRawById(id: number): Promise<any | null> {
    return ProductionOrder.findByPk(id);
  }

  /** @param id - ID da OP. @param transaction - Transacao ativa. @returns OP travada ou null. */
  public async findByIdForUpdate(id: number, transaction: any): Promise<any | null> {
    return ProductionOrder.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  }

  /**
   * Gera o proximo numero de OP do ano (`OP-YYYY-NNNN`).
   *
   * Duas garantias, ambas ausentes no antigo `countByOrderNumberPrefix`
   * (gap G16 da auditoria da cadeia do produto):
   * 1. **Serializacao**: um advisory lock de transacao por ano
   *    (`pg_advisory_xact_lock(classid, ano)`) impede que duas transacoes
   *    concorrentes leiam o mesmo "ultimo numero". O lock e liberado
   *    automaticamente no commit/rollback e e reentrante — o laco de
   *    conversao do MRP pode chamar este metodo N vezes na mesma transacao.
   * 2. **MAX em vez de COUNT**: o sufixo sai do maior numero ja emitido, nao
   *    da contagem de linhas. `COUNT` regride quando uma OP e removida
   *    (`RemoveProductionOrderUseCase`) e reemite um numero ja usado; `MAX`
   *    so cresce. Numeros fora do padrao (`SUBSTRING` sem match) viram NULL e
   *    sao ignorados pelo `MAX`, entao dado legado nao quebra a geracao.
   *
   * Dentro da mesma transacao, as OPs ja inseridas sao enxergadas pelo
   * `MAX` (leitura da propria transacao), o que resolve tambem a colisao
   * dentro do laco.
   *
   * @param yearPrefix - Prefixo anual (ex.: `OP-2026`).
   * @param transaction - Transacao Sequelize ativa (obrigatoria para o lock).
   * @returns Proximo numero completo (ex.: `OP-2026-0004`).
   */
  public async nextOrderNumberForYear(yearPrefix: string, transaction: any): Promise<string> {
    const year = Number(yearPrefix.split('-').pop());

    await sequelize.query(
      'SELECT pg_advisory_xact_lock(:classId, :year)',
      { replacements: { classId: ORDER_NUMBER_LOCK_CLASS_ID, year }, transaction }
    );

    const rows: any[] = await sequelize.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM '([0-9]+)$') AS INTEGER)), 0) AS max_sequence
         FROM production_orders
        WHERE order_number LIKE :prefix`,
      { replacements: { prefix: `${yearPrefix}-%` }, type: QueryTypes.SELECT, transaction }
    );

    const nextSequence = Number(rows[0]?.max_sequence ?? 0) + 1;
    return `${yearPrefix}-${String(nextSequence).padStart(4, '0')}`;
  }

  /** @param data - Dados. @param transaction - Transacao opcional. @returns OP criada. */
  public async create(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return ProductionOrder.create(data, { transaction });
  }

  /** @param id - ID. @param data - Campos. @param transaction - Transacao opcional. @returns Linhas afetadas. */
  public async update(id: number, data: Record<string, unknown>, transaction?: any): Promise<number> {
    const [updated] = await ProductionOrder.update(data, { where: { id }, transaction });
    return updated;
  }

  /** @param id - ID da OP. @returns Linhas removidas. */
  public async destroy(id: number): Promise<number> {
    return ProductionOrder.destroy({ where: { id } });
  }

  /** @param id - ID do produto. @param transaction - Transacao opcional. @returns Produto ou null. */
  public async findProductById(id: number, transaction?: any): Promise<any | null> {
    return Product.findByPk(id, { transaction });
  }

  /**
   * Conta reservas de material ainda vivas da OP (gap G3).
   *
   * @param productionOrderId - ID da OP.
   * @returns Quantidade de linhas `active` em `production_order_reservations`.
   */
  public async countActiveMaterialReservations(productionOrderId: number): Promise<number> {
    return ProductionOrderReservation.count({
      where: { production_order_id: productionOrderId, status: 'active' }
    });
  }

  /** @param filters - Filtros. @returns OPs para relatorio. */
  public async listForReport(filters: any): Promise<any[]> {
    const { start_date, end_date } = filters;
    const where: any = {};
    if (start_date || end_date) {
      where.createdAt = {};
      if (start_date) where.createdAt[Op.gte] = new Date(start_date);
      if (end_date) where.createdAt[Op.lte] = new Date(end_date);
    }
    return ProductionOrder.findAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
        { model: Item, as: 'item', attributes: ['id', 'codigo', 'descricao'] }
      ]
    });
  }

  /** @param productionOrderId - ID da OP. @returns Apontamentos ordenados. */
  public async listTrackingByOrder(productionOrderId: number): Promise<any[]> {
    return ProductionOrderTracking.findAll({
      where: { production_order_id: productionOrderId },
      include: [
        { model: ProductionRouteStep, as: 'routeStep', attributes: ['id', 'sequence', 'step_code', 'name', 'work_center'] },
        { model: Employee, as: 'operator', attributes: ['id', 'name'] }
      ],
      order: [['sequence', 'ASC']]
    });
  }

  /** @param productionOrderId - ID da OP. @param transaction - Transacao ativa. @returns Etapas travadas (sem includes) para reconciliacao. */
  public async listTrackingByOrderForUpdate(productionOrderId: number, transaction: any): Promise<any[]> {
    return ProductionOrderTracking.findAll({
      where: { production_order_id: productionOrderId },
      transaction,
      lock: transaction.LOCK.UPDATE,
      order: [['sequence', 'ASC']]
    });
  }

  /**
   * Lista apontamentos da OP com etapa/centro de trabalho para custeio real
   * de mao-de-obra na conclusao (`ChangeProductionOrderStatusUseCase`).
   *
   * @param productionOrderId - ID da OP.
   * @param transaction - Transacao ativa.
   * @returns Apontamentos com `routeStep.workCenter.cost_per_hour` (quando existir).
   */
  public async listTrackingWithRouteStepByOrder(productionOrderId: number, transaction: any): Promise<any[]> {
    return ProductionOrderTracking.findAll({
      where: { production_order_id: productionOrderId },
      include: [
        {
          model: ProductionRouteStep,
          as: 'routeStep',
          attributes: ['id', 'work_center_id'],
          include: [{ model: WorkCenter, as: 'workCenter', attributes: ['id', 'cost_per_hour'] }]
        }
      ],
      transaction,
      order: [['sequence', 'ASC']]
    });
  }

  /** @param data - Dados da etapa. @param transaction - Transacao opcional. @returns Apontamento criado. */
  public async createTracking(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return ProductionOrderTracking.create(data, { transaction });
  }

  /**
   * Cria varias linhas de apontamento numa unica ida ao banco (gap G4:
   * materializacao das etapas do roteiro ativo na liberacao da OP).
   *
   * @param rows - Linhas de `production_order_tracking`.
   * @param transaction - Transacao ativa.
   * @returns Linhas criadas.
   */
  public async bulkCreateTracking(rows: Array<Record<string, unknown>>, transaction: any): Promise<any[]> {
    if (!rows || rows.length === 0) return [];
    return ProductionOrderTracking.bulkCreate(rows, { transaction });
  }

  /**
   * Busca o roteiro ATIVO do produto com as etapas ATIVAS (gap G4).
   *
   * Somente `status = 'active'` — o ciclo de vida do G5 garante no maximo um
   * roteiro ativo por produto, e revisoes `superseded` continuam existindo
   * intactas para sustentar apontamentos ja feitos. Etapas `is_active = false`
   * ficam de fora: elas nao entram no tempo padrao do roteiro
   * (`computeTotalStandardTimeMinutes`) e, portanto, tambem nao devem virar
   * etapa a apontar.
   *
   * A consulta traz `production_route_steps.id`, que e o que amarra cada
   * apontamento a REVISAO efetivamente executada — o vinculo "como executado"
   * que `production_orders` nao tem por falta de coluna.
   *
   * @param productId - `products.id`.
   * @param transaction - Transacao ativa.
   * @returns Roteiro ativo com `steps`, ou `null`.
   */
  public async findActiveRouteWithStepsByProduct(productId: number, transaction: any): Promise<any | null> {
    return ProductionRoute.findOne({
      where: { product_id: productId, status: 'active' },
      include: [{
        model: ProductionRouteStep,
        as: 'steps',
        required: false,
        where: { is_active: true },
        attributes: ['id', 'sequence', 'step_code', 'name', 'work_center', 'work_center_id', 'is_active'],
      }],
      order: [[{ model: ProductionRouteStep, as: 'steps' }, 'sequence', 'ASC']],
      transaction,
    });
  }

  /** @param id - ID da etapa. @param transaction - Transacao ativa. @returns Etapa travada ou null. */
  public async findTrackingByIdForUpdate(id: number, transaction: any): Promise<any | null> {
    return ProductionOrderTracking.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  }

  /** @param id - ID da etapa. @returns Etapa com includes ou null. */
  public async findTrackingById(id: number): Promise<any | null> {
    return ProductionOrderTracking.findByPk(id, {
      include: [
        { model: ProductionRouteStep, as: 'routeStep', attributes: ['id', 'sequence', 'step_code', 'name', 'work_center'] },
        { model: Employee, as: 'operator', attributes: ['id', 'name'] }
      ]
    });
  }

  /** @param id - ID da etapa. @param data - Campos. @param transaction - Transacao opcional. @returns Linhas afetadas. */
  public async updateTracking(id: number, data: Record<string, unknown>, transaction?: any): Promise<number> {
    const [updated] = await ProductionOrderTracking.update(data, { where: { id }, transaction });
    return updated;
  }
}

export = SequelizeProductionOrderRepository;
