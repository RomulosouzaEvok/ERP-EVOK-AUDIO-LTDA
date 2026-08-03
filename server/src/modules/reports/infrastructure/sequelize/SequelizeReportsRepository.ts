const { Op, QueryTypes } = require('sequelize');
const { Sale, Product, Client, Purchase } = require('../../../../models/index');
const Category = require('../../../../models/Category');
const ReportsRepository = require('../../domain/repositories/ReportsRepository');
const { sequelize } = require('../../../../config/database');

/**
 * Implementação Sequelize/PostgreSQL de `ReportsRepository`, migrada 1:1 do
 * controller anterior (`server/src/controllers/reportController.ts`) — as
 * mesmas queries, agora isoladas do HTTP.
 */
class SequelizeReportsRepository extends ReportsRepository {
  /**
   * @param {Object} filters - `{ start_date, end_date, customer_id }`.
   * @returns {Promise<Object[]>}
   */
  async findSales({ start_date, end_date, customer_id }) {
    const where: any = { status: { [Op.notIn]: ['canceled'] } };
    if (start_date) where.createdAt = { [Op.gte]: new Date(start_date) };
    if (end_date) {
      if (!where.createdAt) where.createdAt = {};
      where.createdAt[Op.lte] = new Date(end_date);
    }
    if (customer_id) where.customer_id = customer_id;

    return Sale.findAll({
      where,
      include: [{ model: Client, as: 'customer', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']]
    });
  }

  /** @returns {Promise<Object[]>} */
  async findActiveProducts() {
    return Product.findAll({
      where: { status: 'active' },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']]
    });
  }

  /** @returns {Promise<Object[]>} */
  async findActiveCustomers() {
    return Client.findAll({ where: { status: 'active' }, order: [['name', 'ASC']] });
  }

  /**
   * @param {Date} start
   * @param {Date} end
   * @returns {Promise<{ sales: number, purchases: number }>}
   */
  async sumCashFlow(start, end) {
    const sales = await Sale.sum('total_amount', {
      where: { createdAt: { [Op.between]: [start, end] }, status: { [Op.notIn]: ['canceled'] } }
    }) || 0;
    const purchases = await Purchase.sum('total_amount', {
      where: { createdAt: { [Op.between]: [start, end] }, status: { [Op.notIn]: ['canceled'] } }
    }) || 0;
    return { sales, purchases };
  }

  /**
   * WIP: OPs abertas (qualquer data) + concluídas dentro do período,
   * agrupadas por status.
   *
   * @param {Date} start
   * @param {Date} end
   * @returns {Promise<Object[]>} `[{ status, orders_count, total_quantity }]`
   */
  async findProductionWip(start, end) {
    return sequelize.query(
      `SELECT status,
              COUNT(*)::int                    AS orders_count,
              COALESCE(SUM(quantity), 0)::float AS total_quantity
         FROM production_orders
        WHERE status NOT IN ('completed', 'canceled')
           OR (status = 'completed' AND updated_at BETWEEN :start AND :end)
        GROUP BY status
        ORDER BY status`,
      { replacements: { start, end }, type: QueryTypes.SELECT }
    );
  }

  /**
   * Agregados de OPs concluídas no período. Lead time usa
   * created_at -> updated_at como aproximação da conclusão (a OP não guarda
   * timestamp dedicado de completed).
   *
   * @param {Date} start
   * @param {Date} end
   * @returns {Promise<Object>}
   */
  async findProductionCompletedAggregates(start, end) {
    const [row] = await sequelize.query(
      `SELECT COUNT(*)::int                                 AS orders_completed,
              COALESCE(SUM(quantity), 0)::float             AS total_planned_quantity,
              COALESCE(SUM(quantity_produced), 0)::float    AS total_produced_quantity,
              COALESCE(SUM(quantity_scrapped), 0)::float    AS total_scrapped_quantity,
              COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400), 0)::float AS avg_days,
              COALESCE(MIN(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400), 0)::float AS min_days,
              COALESCE(MAX(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400), 0)::float AS max_days
         FROM production_orders
        WHERE status = 'completed'
          AND updated_at BETWEEN :start AND :end`,
      { replacements: { start, end }, type: QueryTypes.SELECT }
    );
    return row;
  }

  /**
   * Refugo por etapa de roteiro (apontamentos concluídos no período).
   *
   * @param {Date} start
   * @param {Date} end
   * @returns {Promise<Object[]>}
   */
  async findScrapByStep(start, end) {
    return sequelize.query(
      `SELECT COALESCE(prs.work_center, 'SEM ROTEIRO')  AS work_center,
              COALESCE(prs.name, 'Etapa manual')        AS step_name,
              pot.sequence,
              COALESCE(SUM(pot.quantity_good), 0)::float     AS quantity_good,
              COALESCE(SUM(pot.quantity_scrapped), 0)::float AS quantity_scrapped
         FROM production_order_tracking pot
         LEFT JOIN production_route_steps prs ON prs.id = pot.production_route_step_id
        WHERE pot.status = 'completed'
          AND pot.finished_at BETWEEN :start AND :end
        GROUP BY 1, 2, 3`,
      { replacements: { start, end }, type: QueryTypes.SELECT }
    );
  }

  /**
   * Compras por fornecedor no período (pedidos não cancelados por order_date).
   *
   * @param {Date} start
   * @param {Date} end
   * @returns {Promise<Object[]>}
   */
  async findPurchasingBySupplier(start, end) {
    return sequelize.query(
      `SELECT s.id                                    AS supplier_id,
              s.company_name,
              COUNT(*)::int                           AS orders_count,
              COALESCE(SUM(po.total_amount), 0)::float AS total_amount,
              COUNT(*) FILTER (WHERE po.status IN ('received', 'partial'))::int AS received_orders,
              AVG(po.delivery_date - po.order_date) FILTER (WHERE po.delivery_date IS NOT NULL)::float AS avg_lead_time_days,
              COUNT(*) FILTER (WHERE po.delivery_date IS NOT NULL AND po.expected_date IS NOT NULL AND po.delivery_date <= po.expected_date)::int AS on_time_orders,
              COUNT(*) FILTER (WHERE po.delivery_date IS NOT NULL AND po.expected_date IS NOT NULL)::int AS delivered_with_expected,
              MAX(po.order_date)                      AS last_order_date
         FROM purchase_orders po
         JOIN suppliers s ON s.id = po.supplier_id
        WHERE po.order_date BETWEEN :start AND :end
          AND po.status <> 'canceled'
        GROUP BY s.id, s.company_name
        ORDER BY total_amount DESC`,
      { replacements: { start, end }, type: QueryTypes.SELECT }
    );
  }

  /**
   * RNCs por fornecedor no período (por created_at, robusto a report_date nulo).
   *
   * @param {Date} start
   * @param {Date} end
   * @returns {Promise<Object[]>} `[{ supplier_id, rnc_count }]`
   */
  async findRncCountBySupplier(start, end) {
    return sequelize.query(
      `SELECT supplier_id, COUNT(*)::int AS rnc_count
         FROM non_conformities
        WHERE supplier_id IS NOT NULL
          AND created_at BETWEEN :start AND :end
        GROUP BY supplier_id`,
      { replacements: { start, end }, type: QueryTypes.SELECT }
    );
  }

  /**
   * Totais de compras do período.
   *
   * @param {Date} start
   * @param {Date} end
   * @returns {Promise<Object>}
   */
  async findPurchasingTotals(start, end) {
    const [row] = await sequelize.query(
      `SELECT COUNT(*)::int                            AS orders_count,
              COALESCE(SUM(total_amount), 0)::float    AS total_amount,
              COUNT(*) FILTER (WHERE status IN ('pending', 'approved', 'sent', 'partial'))::int AS open_orders
         FROM purchase_orders
        WHERE order_date BETWEEN :start AND :end
          AND status <> 'canceled'`,
      { replacements: { start, end }, type: QueryTypes.SELECT }
    );
    return row;
  }

  /**
   * Custo real por produto no período: agrega `product_cost_ledgers` (média
   * ponderada por quantidade) e resolve o custo padrão via
   * `items.custo_padrao` (join dual-schema por `products.code = items.codigo`,
   * LEFT JOIN pois nem todo produto tem item correspondente), com fallback
   * para `products.cost_price` quando não há item.
   *
   * @param {Date} start
   * @param {Date} end
   * @returns {Promise<Object[]>}
   */
  async findCostVarianceByProduct(start, end) {
    return sequelize.query(
      `SELECT p.id                                              AS product_id,
              p.code,
              p.name,
              COALESCE(i.custo_padrao, p.cost_price, 0)::float   AS standard_cost,
              COUNT(pcl.id)::int                                 AS entries_count,
              COALESCE(SUM(pcl.quantity), 0)::float              AS total_quantity,
              CASE WHEN COALESCE(SUM(pcl.quantity), 0) > 0
                   THEN (SUM(pcl.quantity * pcl.unit_cost) / SUM(pcl.quantity))::float
                   ELSE 0
              END                                                 AS avg_real_cost
         FROM product_cost_ledgers pcl
         JOIN products p ON p.id = pcl.product_id
         LEFT JOIN items i ON i.codigo = p.code
        WHERE pcl.created_at BETWEEN :start AND :end
        GROUP BY p.id, p.code, p.name, i.custo_padrao, p.cost_price
        ORDER BY p.id`,
      { replacements: { start, end }, type: QueryTypes.SELECT }
    );
  }

  /**
   * Variação de preço de compra por produto x fornecedor no período: preço
   * médio pago (`purchase_order_items.unit_price`, ponderado por quantidade,
   * em pedidos não cancelados) versus preço de catálogo
   * (`item_suppliers.unit_price`). O join com `item_suppliers` é dual-schema
   * (`purchase_order_items.item_id` -> `items.id`, quando presente) e LEFT
   * JOIN pois nem todo item tem catálogo de fornecedor cadastrado.
   *
   * @param {Date} start
   * @param {Date} end
   * @returns {Promise<Object[]>}
   */
  async findPurchasePriceVarianceByProductSupplier(start, end) {
    return sequelize.query(
      `SELECT p.id                                    AS product_id,
              p.code,
              p.name,
              po.supplier_id                           AS supplier_id,
              s.company_name,
              MAX(isup.unit_price)::float              AS catalog_price,
              COALESCE(SUM(poi.quantity), 0)::float    AS total_quantity,
              CASE WHEN COALESCE(SUM(poi.quantity), 0) > 0
                   THEN (SUM(poi.quantity * poi.unit_price) / SUM(poi.quantity))::float
                   ELSE 0
              END                                       AS avg_paid_price
         FROM purchase_order_items poi
         JOIN purchase_orders po ON po.id = poi.purchase_id
         JOIN products p ON p.id = poi.product_id
         JOIN suppliers s ON s.id = po.supplier_id
         LEFT JOIN item_suppliers isup ON isup.item_id = poi.item_id AND isup.supplier_id = po.supplier_id
        WHERE po.order_date BETWEEN :start AND :end
          AND po.status <> 'canceled'
        GROUP BY p.id, p.code, p.name, po.supplier_id, s.company_name
        ORDER BY p.id, po.supplier_id`,
      { replacements: { start, end }, type: QueryTypes.SELECT }
    );
  }
}

module.exports = SequelizeReportsRepository;
