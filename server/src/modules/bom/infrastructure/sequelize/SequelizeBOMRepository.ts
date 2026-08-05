const { Op } = require('sequelize');
const { BillOfMaterial, BillOfMaterialItem, Product } = require('../../../../models/index');
const BOMRepository = require('../../domain/repositories/BOMRepository');
const Validators = require('../../../../utils/validators');

/**
 * Implementação Sequelize do `BOMRepository`, reutilizando os models
 * `BillOfMaterial`, `BillOfMaterialItem` e `Product` já existentes (nenhum
 * model novo foi criado nesta migração). Preserva exatamente as mesmas
 * queries (includes, filtros, ordenação) do `bomController` anterior.
 */
class SequelizeBOMRepository extends BOMRepository {
  /**
   * Lista BOMs com paginação e filtros (status, product_id, busca por nome do produto).
   *
   * @param {Object} filters
   * @param {string} [filters.status]
   * @param {number} [filters.product_id]
   * @param {string} [filters.search]
   * @param {number} filters.limit
   * @param {number} filters.offset
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async list({ status, product_id, search, limit, offset }: {
    status?: string;
    product_id?: number;
    search?: string;
    limit: number;
    offset: number;
  }) {
    const where: any = {};
    if (status) where.status = status;
    if (product_id) where.product_id = product_id;

    const productWhere: any = {};
    if (search) {
      const sanitized = Validators.sanitizeSearch(search);
      productWhere.name = { [Op.like]: `%${sanitized}%` };
    }

    return BillOfMaterial.findAndCountAll({
      where,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'code', 'product_type'],
          where: Object.keys(productWhere).length > 0 ? productWhere : undefined
        }
      ],
      limit,
      offset,
      order: [['updatedAt', 'DESC']]
    });
  }

  /**
   * Busca uma BOM por id, com produto e itens (incluindo componente de cada item).
   *
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id: number) {
    return BillOfMaterial.findByPk(id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code', 'product_type'] },
        {
          model: BillOfMaterialItem,
          as: 'items',
          include: [{ model: Product, as: 'componentProduct', attributes: ['id', 'name', 'code', 'cost_price'] }],
          order: [['bom_level', 'ASC'], ['sequence_order', 'ASC']]
        }
      ]
    });
  }

  /**
   * Busca a BOM ativa (`status = 'active'`) de um produto.
   *
   * @param {number} productId
   * @returns {Promise<Object|null>}
   */
  async findActiveByProduct(productId: number) {
    return BillOfMaterial.findOne({
      where: { product_id: productId, status: 'active' },
      include: [
        {
          model: BillOfMaterialItem,
          as: 'items',
          include: [{ model: Product, as: 'componentProduct', attributes: ['id', 'name', 'code', 'cost_price', 'quantity', 'min_quantity'] }],
          order: [['bom_level', 'ASC'], ['sequence_order', 'ASC']]
        }
      ]
    });
  }

  /**
   * Lista todas as versões (qualquer status) de BOM de um produto, ordenadas
   * por data de criação (mais antiga primeiro), para o endpoint aditivo
   * `GET /product/:productId/versions`.
   *
   * @param {number} productId
   * @returns {Promise<Object[]>}
   */
  async listVersionsByProduct(productId: number) {
    return BillOfMaterial.findAll({
      where: { product_id: productId },
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }],
      order: [['createdAt', 'ASC']]
    });
  }

  /**
   * Busca uma BOM "crua" (sem includes), usada internamente para checagens de existência/status.
   *
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findRawById(id: number) {
    return BillOfMaterial.findByPk(id);
  }

  /**
   * Busca um produto por id (usado para validar existência antes de buscar BOM ativa).
   *
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findProductById(id: number) {
    return Product.findByPk(id);
  }

  /**
   * Atualiza campos gerais de uma BOM (`revision`, `revision_notes`, `notes`, `status`).
   *
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<number>} Número de linhas afetadas.
   */
  async update(id: number, data: Record<string, unknown>) {
    const [updated] = await BillOfMaterial.update(data, { where: { id } });
    return updated;
  }

  /**
   * Lista itens de uma BOM, com o produto componente.
   *
   * @param {number} bomId
   * @returns {Promise<Object[]>}
   */
  async listItems(bomId: number) {
    return BillOfMaterialItem.findAll({
      where: { bom_id: bomId },
      include: [{ model: Product, as: 'componentProduct', attributes: ['id', 'name', 'code', 'cost_price', 'quantity'] }],
      order: [['bom_level', 'ASC'], ['sequence_order', 'ASC']]
    });
  }
}

module.exports = SequelizeBOMRepository;



