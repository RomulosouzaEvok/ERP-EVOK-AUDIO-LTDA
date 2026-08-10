/**
 * Implementacao Sequelize do repositorio de Roteiro de Producao (gap G5).
 *
 * Unico lugar do modulo de roteiro que conhece Sequelize/PostgreSQL.
 *
 * @module modules/production/infrastructure/sequelize/SequelizeProductionRouteRepository
 */

import { Op } from 'sequelize';
import ProductionRouteRepository from '../../domain/repositories/ProductionRouteRepository';

const {
  ProductionRoute,
  ProductionRouteStep,
  ProductionOrderTracking,
  Product,
  Item,
  User,
  WorkCenter,
}: any = require('../../../../models/index');

class SequelizeProductionRouteRepository extends ProductionRouteRepository {
  /**
   * Lista roteiros paginados com produto/item incluidos (sem etapas — a
   * listagem e cabecalho; as etapas vem no detalhe).
   *
   * @param filters - `{ product_id, status, route_code, search }`.
   * @param pagination - `{ limit, offset }`.
   * @returns `{ rows, count }`.
   */
  public async listRoutes(filters: Record<string, any>, pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    const where: any = {};

    if (filters.product_id) where.product_id = filters.product_id;
    if (filters.status) where.status = filters.status;
    if (filters.route_code) where.route_code = String(filters.route_code).trim().toUpperCase();
    if (filters.search) {
      where[Op.or] = [
        { route_code: { [Op.iLike]: `%${filters.search}%` } },
        { description: { [Op.iLike]: `%${filters.search}%` } },
      ];
    }

    const { rows, count } = await ProductionRoute.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'code', 'name', 'product_type', 'status'] },
        { model: Item, as: 'item', attributes: ['id', 'codigo', 'descricao'], required: false },
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['product_id', 'ASC'], ['revision', 'DESC']],
      distinct: true,
    });

    return { rows, count };
  }

  /**
   * Busca um roteiro por id com etapas ordenadas e centro de trabalho de cada etapa.
   *
   * @param id - Id do roteiro.
   * @returns Roteiro ou `null`.
   */
  public async findRouteById(id: number): Promise<any | null> {
    return ProductionRoute.findByPk(id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'code', 'name', 'product_type', 'status'] },
        { model: Item, as: 'item', attributes: ['id', 'codigo', 'descricao'], required: false },
        { model: User, as: 'createdBy', attributes: ['id', 'name', 'email'], required: false },
        { model: User, as: 'approvedBy', attributes: ['id', 'name', 'email'], required: false },
        {
          model: ProductionRouteStep,
          as: 'steps',
          required: false,
          include: [{ model: WorkCenter, as: 'workCenter', attributes: ['id', 'code', 'name', 'active'], required: false }],
        },
      ],
      order: [[{ model: ProductionRouteStep, as: 'steps' }, 'sequence', 'ASC']],
    });
  }

  /** @param id - Id do roteiro. @param transaction - Transacao ativa. @returns Roteiro cru ou `null`. */
  public async findRouteByIdRaw(id: number, transaction?: any): Promise<any | null> {
    return ProductionRoute.findByPk(id, { transaction });
  }

  /** @param id - Id do roteiro. @param transaction - Transacao ativa (obrigatoria). @returns Roteiro travado ou `null`. */
  public async findRouteByIdForUpdate(id: number, transaction: any): Promise<any | null> {
    return ProductionRoute.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  }

  /** @param routeCode - Codigo normalizado. @param transaction - Transacao ativa. @returns Roteiro ou `null`. */
  public async findRouteByCode(routeCode: string, transaction?: any): Promise<any | null> {
    return ProductionRoute.findOne({ where: { route_code: routeCode }, transaction });
  }

  /** @param productId - Id do produto. @param revision - Revisao. @param transaction - Transacao ativa. @returns Roteiro ou `null`. */
  public async findRouteByProductAndRevision(productId: number, revision: string, transaction?: any): Promise<any | null> {
    return ProductionRoute.findOne({ where: { product_id: productId, revision }, transaction });
  }

  /**
   * Busca o roteiro `active` do produto. Quando ha transacao, aplica lock
   * pessimista: e assim que a ativacao de uma nova revisao serializa a
   * substituicao da revisao anterior (so 1 ativo por produto).
   *
   * @param productId - Id do produto legado.
   * @param transaction - Transacao ativa (opcional).
   * @returns Roteiro ativo ou `null`.
   */
  public async findActiveRouteByProduct(productId: number, transaction?: any): Promise<any | null> {
    return ProductionRoute.findOne({
      where: { product_id: productId, status: 'active' },
      transaction,
      ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
    });
  }

  /** @param productId - Id do produto. @param transaction - Transacao ativa. @returns Revisoes ja usadas. */
  public async listRevisionsByProduct(productId: number, transaction?: any): Promise<string[]> {
    const rows = await ProductionRoute.findAll({
      where: { product_id: productId },
      attributes: ['revision'],
      transaction,
      raw: true,
    });

    return rows.map((row: any) => String(row.revision));
  }

  /** @param data - Campos do roteiro. @param transaction - Transacao ativa. @returns Roteiro criado. */
  public async createRoute(data: Record<string, any>, transaction?: any): Promise<any> {
    return ProductionRoute.create(data, { transaction });
  }

  /** @param id - Id do roteiro. @param data - Campos a atualizar. @param transaction - Transacao ativa. */
  public async updateRouteFields(id: number, data: Record<string, any>, transaction?: any): Promise<void> {
    await ProductionRoute.update(data, { where: { id }, transaction });
  }

  /** @param id - Id do roteiro. @param transaction - Transacao ativa. */
  public async deleteRoute(id: number, transaction?: any): Promise<void> {
    await ProductionRoute.destroy({ where: { id }, transaction });
  }

  /** @param routeId - Id do roteiro. @param transaction - Transacao ativa. @returns Etapas ordenadas. */
  public async listSteps(routeId: number, transaction?: any): Promise<any[]> {
    return ProductionRouteStep.findAll({
      where: { production_route_id: routeId },
      include: [{ model: WorkCenter, as: 'workCenter', attributes: ['id', 'code', 'name', 'active'], required: false }],
      order: [['sequence', 'ASC']],
      transaction,
    });
  }

  /** @param routeId - Id do roteiro. @param transaction - Transacao ativa (obrigatoria). */
  public async deleteStepsByRoute(routeId: number, transaction: any): Promise<void> {
    await ProductionRouteStep.destroy({ where: { production_route_id: routeId }, transaction });
  }

  /** @param data - Campos da etapa. @param transaction - Transacao ativa (obrigatoria). @returns Etapa criada. */
  public async createStep(data: Record<string, any>, transaction: any): Promise<any> {
    return ProductionRouteStep.create(data, { transaction });
  }

  /**
   * Conta apontamentos que apontam para qualquer etapa do roteiro.
   *
   * @param routeId - Id do roteiro.
   * @param transaction - Transacao ativa (opcional).
   * @returns Quantidade de apontamentos vinculados.
   */
  public async countTrackingByRoute(routeId: number, transaction?: any): Promise<number> {
    const stepIds = await ProductionRouteStep.findAll({
      where: { production_route_id: routeId },
      attributes: ['id'],
      transaction,
      raw: true,
    });

    if (stepIds.length === 0) return 0;

    return ProductionOrderTracking.count({
      where: { production_route_step_id: { [Op.in]: stepIds.map((step: any) => step.id) } },
      transaction,
    });
  }

  /** @param productId - Id do produto. @param transaction - Transacao ativa. @returns Produto ou `null`. */
  public async findProductByIdRaw(productId: number, transaction?: any): Promise<any | null> {
    return Product.findByPk(productId, { transaction });
  }

  /**
   * Dual-write best-effort de `item_id` (Fase 4.8 expand-contract): resolve o
   * Item canonico pelo mesmo codigo do produto legado.
   *
   * @param productCode - `products.code`.
   * @param transaction - Transacao ativa (opcional).
   * @returns UUID do Item ou `null` quando nao houver equivalente.
   */
  public async findItemIdByProductCode(productCode: string, transaction?: any): Promise<string | null> {
    if (!productCode) return null;

    const item = await Item.findOne({
      where: { codigo: productCode },
      attributes: ['id'],
      transaction,
      raw: true,
    });

    return item ? String(item.id) : null;
  }

  /** @param ids - Ids de centro de trabalho. @param transaction - Transacao ativa. @returns Centros encontrados. */
  public async findWorkCentersByIds(ids: number[], transaction?: any): Promise<Array<{ id: number; code: string; name: string; active: boolean }>> {
    if (!ids || ids.length === 0) return [];

    return WorkCenter.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: ['id', 'code', 'name', 'active'],
      transaction,
      raw: true,
    });
  }
}

export = SequelizeProductionRouteRepository;
