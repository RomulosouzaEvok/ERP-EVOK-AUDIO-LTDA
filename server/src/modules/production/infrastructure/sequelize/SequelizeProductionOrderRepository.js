const { Op } = require('sequelize');
const { ProductionOrder, Product, Employee, User } = require('../../../../models/index');
const ProductionOrderRepository = require('../../domain/repositories/ProductionOrderRepository');

/**
 * Implementação Sequelize do `ProductionOrderRepository`, reutilizando os
 * models `ProductionOrder`, `Product`, `Employee` e `User` já existentes
 * (nenhum model novo foi criado nesta migração). Preserva exatamente as
 * mesmas queries (includes, filtros, ordenação) do `productionOrderController`
 * legado.
 */
class SequelizeProductionOrderRepository extends ProductionOrderRepository {
  /**
   * Lista OPs com paginação e filtros (status, product_id, priority, período de criação),
   * incluindo os totais de summary (total, planned, in_progress, completed, overdue).
   *
   * @param {Object} filters
   * @param {string} [filters.status]
   * @param {number} [filters.product_id]
   * @param {string} [filters.priority]
   * @param {string} [filters.start_date]
   * @param {string} [filters.end_date]
   * @param {number} filters.limit
   * @param {number} filters.offset
   * @returns {Promise<{ rows: Object[], count: number, totals: number[] }>}
   */
  async list({ status, product_id, priority, start_date, end_date, limit, offset }) {
    const where = {};
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
        { model: Employee, as: 'responsible', attributes: ['id', 'name'] }
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

  /**
   * Busca uma OP por id, com produto, responsável e criador.
   *
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return ProductionOrder.findByPk(id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code', 'product_type'] },
        { model: Employee, as: 'responsible', attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['id', 'name'] }
      ]
    });
  }

  /**
   * Busca uma OP por id com apenas o produto (attributes reduzidas), usada
   * para retornar a resposta de `create`/`update`/`updateStatus`.
   *
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findByIdWithProductSummary(id) {
    return ProductionOrder.findByPk(id, {
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }]
    });
  }

  /**
   * Busca uma OP "crua" (sem includes).
   *
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findRawById(id) {
    return ProductionOrder.findByPk(id);
  }

  /**
   * Busca uma OP com lock pessimista (`FOR UPDATE`) dentro de uma
   * transação, para impedir que duas requisições concorrentes de mudança de
   * status (ex.: duplo clique em "concluir") leiam o mesmo status e ambas
   * apliquem a transição, duplicando efeitos colaterais (ex.: entrada de estoque).
   *
   * @param {number} id
   * @param {import('sequelize').Transaction} transaction
   * @returns {Promise<Object|null>}
   */
  async findByIdForUpdate(id, transaction) {
    return ProductionOrder.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  }

  /**
   * Conta OPs cujo `order_number` começa com o prefixo informado (usado
   * para gerar o próximo número sequencial `OP-<ano>-XXXX`).
   *
   * @param {string} yearPrefix - Ex.: `OP-2026`.
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<number>}
   */
  async countByOrderNumberPrefix(yearPrefix, transaction) {
    return ProductionOrder.count({ where: { order_number: { [Op.like]: `${yearPrefix}%` } }, transaction });
  }

  /**
   * Cria uma nova ordem de produção.
   *
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object>}
   */
  async create(data, transaction) {
    return ProductionOrder.create(data, { transaction });
  }

  /**
   * Atualiza campos de uma OP.
   *
   * @param {number} id
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<number>} Número de linhas afetadas.
   */
  async update(id, data, transaction) {
    const [updated] = await ProductionOrder.update(data, { where: { id }, transaction });
    return updated;
  }

  /**
   * Remove uma OP.
   *
   * @param {number} id
   * @returns {Promise<number>} Número de linhas afetadas.
   */
  async destroy(id) {
    return ProductionOrder.destroy({ where: { id } });
  }

  /**
   * Busca um produto por id.
   *
   * @param {number} id
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object|null>}
   */
  async findProductById(id, transaction) {
    return Product.findByPk(id, { transaction });
  }

  /**
   * Lista OPs para o relatório de produção, em um período opcional.
   *
   * @param {Object} filters
   * @param {string} [filters.start_date]
   * @param {string} [filters.end_date]
   * @returns {Promise<Object[]>}
   */
  async listForReport({ start_date, end_date }) {
    const where = {};
    if (start_date || end_date) {
      where.createdAt = {};
      if (start_date) where.createdAt[Op.gte] = new Date(start_date);
      if (end_date) where.createdAt[Op.lte] = new Date(end_date);
    }

    return ProductionOrder.findAll({
      where,
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }]
    });
  }
}

module.exports = SequelizeProductionOrderRepository;
