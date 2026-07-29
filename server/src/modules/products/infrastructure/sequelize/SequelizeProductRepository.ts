const { Op, col } = require('sequelize');
const ProductRepository = require('../../domain/repositories/ProductRepository');
const { Product, Category, Sale } = require('../../../../models/index');

/**
 * Implementação Sequelize/PostgreSQL do contrato `ProductRepository`.
 *
 * Reutiliza o model Sequelize já existente `server/src/models/Product.ts` —
 * nenhum novo model é criado por este módulo. Trabalha com instâncias/registros
 * Sequelize; a conversão para `ProductEntity` é responsabilidade de quem chama
 * (tipicamente via `ProductMapper`).
 */
class SequelizeProductRepository extends ProductRepository {
  /**
   * @inheritdoc
   * @param {Object} [filters]
   * @param {string} [filters.search] - Termo de busca (nome ou código).
   * @param {number} [filters.category_id]
   * @param {string} [filters.status] - `active` | `inactive`.
   * @param {boolean} [filters.low_stock] - Se `true`, filtra `quantity <= min_quantity`.
   * @param {Object} [pagination]
   * @param {number} [pagination.limit]
   * @param {number} [pagination.offset]
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async list(filters: any = {}, pagination: any = {}) {
    const where: any = {};
    if (filters.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${filters.search}%` } },
        { code: { [Op.like]: `%${filters.search}%` } }
      ];
    }
    if (filters.category_id) where.category_id = filters.category_id;
    where.status = filters.status || 'active';
    if (filters.low_stock === true || filters.low_stock === 'true') {
      where.quantity = { [Op.lte]: col('min_quantity') };
    }

    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']]
    });

    return { rows, count };
  }

  /**
   * @inheritdoc
   * @param {number} id
   * @param {Object} [options]
   * @param {boolean} [options.withCategory=true] - Se deve incluir a associação `category`.
   * @returns {Promise<Object|null>}
   */
  async findById(id, { withCategory = true } = {}) {
    return Product.findByPk(id, withCategory
      ? { include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }] }
      : {});
  }

  /** @inheritdoc */
  async findByCode(code) {
    return Product.findOne({ where: { code } });
  }

  /** @inheritdoc */
  async create(data) {
    return Product.create(data);
  }

  /** @inheritdoc */
  async update(id, data) {
    const [updated] = await Product.update(data, { where: { id } });
    if (!updated) return null;
    return this.findById(id);
  }

  /**
   * @inheritdoc
   * Consulta o model `Sale` (ainda não migrado para módulo próprio) para
   * verificar vendas em status `confirmed`/`invoiced` associadas ao produto.
   */
  async countActiveSales(productId) {
    return Sale.count({ where: { product_id: productId, status: { [Op.in]: ['confirmed', 'invoiced'] } } });
  }
}

module.exports = SequelizeProductRepository;




