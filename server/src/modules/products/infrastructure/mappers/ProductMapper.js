const ProductEntity = require('../../domain/entities/ProductEntity');
const { TS_FIELDS } = require('../../domain/value-objects/ThieleSmallParams');

/**
 * Converte entre registros do model Sequelize `Product` e a entidade de
 * domínio `ProductEntity`.
 */
class ProductMapper {
  /**
   * Converte uma instância (ou objeto plano) do model Sequelize `Product`
   * para `ProductEntity`.
   *
   * @param {Object} record - Instância Sequelize (`.get({ plain: true })`-like) ou objeto plano do produto.
   * @returns {ProductEntity} Entidade de domínio equivalente.
   */
  static toEntity(record) {
    const plain = typeof record.get === 'function' ? record.get({ plain: true }) : record;
    const tsParams = {};
    for (const field of TS_FIELDS) {
      const value = plain[`ts_params_${field}`];
      if (value !== undefined && value !== null) tsParams[field] = value;
    }
    return new ProductEntity({
      id: plain.id,
      name: plain.name,
      code: plain.code,
      description: plain.description,
      category_id: plain.category_id,
      price: plain.price,
      cost_price: plain.cost_price,
      quantity: plain.quantity,
      min_quantity: plain.min_quantity,
      status: plain.status,
      location: plain.location,
      product_type: plain.product_type,
      ncm: plain.ncm,
      cest: plain.cest,
      weight: plain.weight,
      unit: plain.unit,
      lead_time: plain.lead_time,
      drawing_number: plain.drawing_number,
      revision: plain.revision,
      tsParams,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt
    });
  }

  /**
   * Converte um `ProductEntity` para o formato de atributos aceito pelo
   * model Sequelize `Product` (delegado à própria entidade).
   *
   * @param {ProductEntity} entity - Entidade de domínio.
   * @returns {Object} Objeto plano pronto para `Product.create`/`Product.update`.
   */
  static toPersistence(entity) {
    return entity.toPersistence();
  }
}

module.exports = ProductMapper;
