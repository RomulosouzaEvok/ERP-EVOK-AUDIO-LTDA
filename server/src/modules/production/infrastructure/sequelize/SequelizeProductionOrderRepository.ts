/**
 * Implementacao Sequelize do repositorio de OP.
 *
 * @module modules/production/infrastructure/sequelize/SequelizeProductionOrderRepository
 */

import { Op } from 'sequelize';
import ProductionOrderRepository from '../../domain/repositories/ProductionOrderRepository';
const { ProductionOrder, Product, Employee, User, ProductionOrderTracking, ProductionRouteStep, Item }: any = require('../../../../models/index');

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

  /** @param yearPrefix - Prefixo anual. @param transaction - Transacao opcional. @returns Total encontrado. */
  public async countByOrderNumberPrefix(yearPrefix: string, transaction?: any): Promise<number> {
    return ProductionOrder.count({ where: { order_number: { [Op.like]: `${yearPrefix}%` } }, transaction });
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

  /** @param data - Dados da etapa. @param transaction - Transacao opcional. @returns Apontamento criado. */
  public async createTracking(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return ProductionOrderTracking.create(data, { transaction });
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
