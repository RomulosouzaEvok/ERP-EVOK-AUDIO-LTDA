import ItemSupplierRepository from '../../domain/repositories/ItemSupplierRepository';
const { ItemSupplier, Supplier, Item, sequelize } = require('../../../../models/index');

/**
 * Implementacao Sequelize do repositorio de catalogo item x fornecedor.
 */
class SequelizeItemSupplierRepository extends ItemSupplierRepository {
  /** @inheritdoc */
  public async listByItem(itemId: string): Promise<any[]> {
    return ItemSupplier.findAll({
      where: { item_id: itemId, active: true },
      include: [{ model: Supplier, as: 'supplier', attributes: ['id', 'company_name'] }],
      order: [['preferred', 'DESC'], ['id', 'ASC']],
    });
  }

  /** @inheritdoc */
  public async listBySupplier(supplierId: number): Promise<any[]> {
    return ItemSupplier.findAll({
      where: { supplier_id: supplierId, active: true },
      include: [{ model: Item, as: 'item', attributes: ['id', 'codigo', 'descricao'] }],
      order: [['id', 'ASC']],
    });
  }

  /** @inheritdoc */
  public async findById(linkId: number): Promise<any | null> {
    return ItemSupplier.findByPk(linkId, {
      include: [{ model: Supplier, as: 'supplier', attributes: ['id', 'company_name'] }],
    });
  }

  /** @inheritdoc */
  public async findByItemAndSupplier(itemId: string, supplierId: number): Promise<any | null> {
    return ItemSupplier.findOne({ where: { item_id: itemId, supplier_id: supplierId } });
  }

  /** @inheritdoc */
  public async create(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return ItemSupplier.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async update(linkId: number, data: Record<string, unknown>, transaction?: any): Promise<any> {
    const link = await ItemSupplier.findByPk(linkId, transaction ? { transaction } : undefined);
    if (!link) return null;
    return link.update(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async clearPreferredForItem(itemId: string, exceptLinkId?: number, transaction?: any): Promise<void> {
    const { Op } = require('sequelize');
    const where: any = { item_id: itemId, preferred: true };
    if (exceptLinkId) {
      where.id = { [Op.ne]: exceptLinkId };
    }
    await ItemSupplier.update({ preferred: false }, { where, ...(transaction ? { transaction } : {}) });
  }

  /** @inheritdoc */
  public async getPurchaseHistoryByItem(itemId: string): Promise<any[]> {
    const rows: any[] = await sequelize.query(
      `
      SELECT
        s.id AS supplier_id,
        s.company_name,
        COUNT(DISTINCT po.id) AS orders_count,
        SUM(poi.quantity) AS total_quantity,
        MIN(poi.unit_price) AS min_price,
        MAX(poi.unit_price) AS max_price,
        AVG(poi.unit_price) AS avg_price,
        MAX(po.order_date) AS last_order_date
      FROM purchase_order_items poi
      JOIN purchase_orders po ON po.id = poi.purchase_id
      JOIN suppliers s ON s.id = po.supplier_id
      WHERE (
        poi.item_id = :itemId
        OR poi.product_id IN (
          SELECT id FROM products WHERE code = (SELECT codigo FROM items WHERE id = :itemId)
        )
      )
      AND po.status IN ('received', 'partial', 'approved', 'sent')
      GROUP BY s.id, s.company_name
      ORDER BY last_order_date DESC
      `,
      {
        replacements: { itemId },
        type: 'SELECT' as any,
      }
    );

    return rows;
  }
}

export = SequelizeItemSupplierRepository;
