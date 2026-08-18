/**
 * Implementação Sequelize do repositório do módulo `fiscal`.
 *
 * @module modules/fiscal/infrastructure/sequelize/SequelizeFiscalRepository
 */

const FiscalRepository = require('../../domain/repositories/FiscalRepository');
const { QueryTypes } = require('sequelize');
const {
  CompanyFiscalConfig,
  Purchase,
  Sale,
  SaleItem,
  Client,
  Product,
  SaleInvoice,
  AccountReceivable,
  sequelize,
} = require('../../../../models/index');

interface FindOptions {
  transaction?: any;
  lock?: any;
}

class SequelizeFiscalRepository extends FiscalRepository {
  /** @inheritdoc */
  async findCompanyFiscalConfig(options?: FindOptions) {
    return CompanyFiscalConfig.findByPk(1, options);
  }

  /**
   * @inheritdoc
   * `data` já vem filtrada para os campos permitidos pelo use case
   * (`UpsertCompanyFiscalConfigUseCase`) — este método só persiste.
   */
  async upsertCompanyFiscalConfig(data: Record<string, unknown>) {
    const existing = await CompanyFiscalConfig.findByPk(1);
    if (existing) {
      Object.assign(existing, data);
      await existing.save();
      return existing;
    }

    return CompanyFiscalConfig.create({ id: 1, ...data });
  }

  /** @inheritdoc */
  async findPurchaseById(purchaseId: number | string) {
    return Purchase.findByPk(purchaseId);
  }

  /** @inheritdoc */
  async findSaleById(saleId: number | string, options?: FindOptions) {
    return Sale.findByPk(saleId, options);
  }

  /** @inheritdoc */
  async findSaleItemsBySaleId(saleId: number | string, options?: FindOptions) {
    return SaleItem.findAll({ where: { sale_id: saleId }, ...options });
  }

  /** @inheritdoc */
  async findClientById(clientId: number | string, options?: FindOptions) {
    return Client.findByPk(clientId, options);
  }

  /** @inheritdoc */
  async findProductsByIds(productIds: Array<number | string>, options?: FindOptions) {
    return Product.findAll({ where: { id: productIds }, ...options });
  }

  /** @inheritdoc */
  async createSaleInvoice(data: Record<string, unknown>, options?: FindOptions) {
    return SaleInvoice.create(data, options);
  }

  /** @inheritdoc */
  async findSaleInvoiceByProviderRef(providerRef: string, options?: FindOptions) {
    return SaleInvoice.findOne({ where: { nfe_provider_ref: providerRef }, ...options });
  }

  /** @inheritdoc */
  async findSaleInvoicesBySaleId(saleId: number | string, options?: FindOptions) {
    return SaleInvoice.findAll({ where: { sale_id: saleId }, order: [['created_at', 'DESC'], ['id', 'DESC']], ...options });
  }

  /** @inheritdoc */
  async createAccountReceivable(data: Record<string, unknown>, options?: FindOptions) {
    return AccountReceivable.create(data, options);
  }

  /** @inheritdoc */
  async findReceivablesBySaleId(saleId: number | string, options?: FindOptions) {
    return AccountReceivable.findAll({ where: { sale_id: saleId }, order: [['installment', 'ASC']], ...options });
  }

  /** @inheritdoc */
  async findBlocoKPreview(startDate: string, endDate: string) {
    const [k200, k230, k235] = await Promise.all([
      sequelize.query(
        `SELECT p.id                                              AS product_id,
                p.code                                            AS product_code,
                p.name                                            AS product_name,
                p.product_type                                    AS product_type,
                p.unit                                            AS unit,
                COALESCE(p.quantity, 0)::float                    AS quantity_global,
                COALESCE(ws.quantity_by_warehouse, 0)::float      AS quantity_by_warehouse,
                COALESCE(lc.available_quantity, 0)::float         AS quantity_available_in_lots,
                COALESCE(lc.lots_count, 0)::int                  AS lots_count
           FROM products p
           LEFT JOIN (
             SELECT product_id, SUM(quantity)::numeric AS quantity_by_warehouse
               FROM product_warehouse_stock
              GROUP BY product_id
           ) ws ON ws.product_id = p.id
           LEFT JOIN (
             SELECT product_id,
                    SUM(quantity_available)::numeric AS available_quantity,
                    COUNT(*)::int                    AS lots_count
               FROM lot_controls
              GROUP BY product_id
           ) lc ON lc.product_id = p.id
          ORDER BY p.code ASC`,
        { type: QueryTypes.SELECT },
      ),
      sequelize.query(
        `SELECT po.id                                                       AS production_order_id,
                po.order_number                                             AS order_number,
                po.product_id                                               AS product_id,
                p.code                                                      AS product_code,
                p.name                                                      AS product_name,
                p.unit                                                      AS unit,
                po.quantity                                                 AS planned_quantity,
                po.quantity_produced                                        AS quantity_produced,
                po.quantity_scrapped                                        AS quantity_scrapped,
                po.status                                                   AS status,
                po.completion_date                                           AS completion_date,
                po.production_route_id                                      AS production_route_id
           FROM production_orders po
           JOIN products p ON p.id = po.product_id
          WHERE po.status = 'completed'
            AND COALESCE(po.completion_date, po.created_at::date) BETWEEN CAST(:startDate AS date) AND CAST(:endDate AS date)
          ORDER BY COALESCE(po.completion_date, po.created_at::date) ASC, po.id ASC`,
        { replacements: { startDate, endDate }, type: QueryTypes.SELECT },
      ),
      sequelize.query(
        `SELECT pcl.id                                                       AS consumption_id,
                pcl.production_order_id                                     AS production_order_id,
                po.order_number                                             AS order_number,
                pcl.product_id                                               AS product_id,
                p.code                                                       AS product_code,
                p.name                                                       AS product_name,
                pcl.lot_control_id                                           AS lot_control_id,
                lc.lot_number                                                AS lot_number,
                pcl.quantity_consumed                                        AS quantity_consumed,
                pcl.consumed_at                                              AS consumed_at,
                pcl.user_id                                                  AS user_id
           FROM production_lot_consumptions pcl
           JOIN production_orders po ON po.id = pcl.production_order_id
           JOIN products p ON p.id = pcl.product_id
      LEFT JOIN lot_controls lc ON lc.id = pcl.lot_control_id
          WHERE pcl.consumed_at BETWEEN CAST(:startDate AS date) AND CAST(:endDate AS date) + INTERVAL '1 day' - INTERVAL '1 second'
          ORDER BY pcl.consumed_at ASC, pcl.id ASC`,
        { replacements: { startDate, endDate }, type: QueryTypes.SELECT },
      ),
    ]);

    return {
      report_type: 'bloco-k-preview',
      generated_at: new Date(),
      period: { start_date: startDate, end_date: endDate },
      summary: {
        k200_count: (k200 as any[]).length,
        k230_count: (k230 as any[]).length,
        k235_count: (k235 as any[]).length,
        k280_count: 0,
      },
      k200,
      k230,
      k235,
      k280: [],
    };
  }
}

module.exports = SequelizeFiscalRepository;
