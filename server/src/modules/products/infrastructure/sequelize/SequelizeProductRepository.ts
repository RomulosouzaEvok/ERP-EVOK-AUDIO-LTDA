const { Op, col } = require('sequelize');
const ProductRepository = require('../../domain/repositories/ProductRepository');
const {
  Product,
  Category,
  Sale,
  SaleItem,
  BillOfMaterial,
  BillOfMaterialItem,
  Warehouse,
  ProductWarehouseStock,
} = require('../../../../models/index');
const Validators = require('../../../../utils/validators');

class SequelizeProductRepository extends ProductRepository {
  async list(filters: any = {}, pagination: any = {}) {
    const where: any = {};
    if (filters.search) {
      const sanitized = Validators.sanitizeSearch(filters.search);
      where[Op.or] = [
        { name: { [Op.like]: `%${sanitized}%` } },
        { code: { [Op.like]: `%${sanitized}%` } },
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
      order: [['createdAt', 'DESC']],
    });

    return { rows, count };
  }

  async findById(id: number | string, { withCategory = true }: { withCategory?: boolean } = {}) {
    return Product.findByPk(id, withCategory
      ? { include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }] }
      : {});
  }

  async findByCode(code: string) {
    return Product.findOne({ where: { code } });
  }

  async create(data: Record<string, unknown>, transaction?: any) {
    return Product.create(data, transaction ? { transaction } : undefined);
  }

  async update(id: number | string, data: Record<string, unknown>) {
    const [updated] = await Product.update(data, { where: { id } });
    if (!updated) return null;
    return this.findById(id);
  }

  async countActiveSales(productId: number | string) {
    return SaleItem.count({
      where: { product_id: productId },
      include: [{
        model: Sale,
        as: 'sale',
        required: true,
        where: { status: { [Op.in]: ['confirmed', 'invoiced'] } },
      }],
    });
  }

  async countActiveBomLinks(productId: number | string) {
    const [activeAsParent, activeAsComponent] = await Promise.all([
      BillOfMaterial.count({
        where: {
          product_id: productId,
          status: { [Op.in]: ['draft', 'active'] },
        },
      }),
      BillOfMaterialItem.count({
        where: { component_product_id: productId },
        include: [{
          model: BillOfMaterial,
          as: 'bom',
          required: true,
          where: { status: { [Op.in]: ['draft', 'active'] } },
        }],
      }),
    ]);

    return activeAsParent + activeAsComponent;
  }

  async getWarehouseStockSummary(productId: number | string) {
    const [warehouses, stocks] = await Promise.all([
      Warehouse.findAll({ where: { active: true }, order: [['code', 'ASC']] }),
      ProductWarehouseStock.findAll({ where: { product_id: productId } }),
    ]);

    const stockByWarehouseId = new Map(stocks.map((s: any) => [s.warehouse_id, Number(s.quantity)]));

    return warehouses.map((w: any) => ({
      warehouse_id: w.id,
      warehouse_code: w.code,
      warehouse_name: w.name,
      quantity: stockByWarehouseId.get(w.id) ?? 0,
    }));
  }
}

module.exports = SequelizeProductRepository;
