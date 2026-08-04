/**
 * Implementacao Sequelize do repositorio de indicadores do Dashboard.
 *
 * @module modules/dashboard/infrastructure/sequelize/SequelizeDashboardRepository
 */

import DashboardRepository from '../../domain/repositories/DashboardRepository';
const {
  Product,
  Sale,
  Purchase,
  ProductionOrder,
  AccountReceivable,
  AccountPayable,
  Client,
  sequelize
}: any = require('../../../../models/index');
const { Op, col, QueryTypes }: any = require('sequelize');

class SequelizeDashboardRepository extends DashboardRepository {
  /** @inheritdoc */
  public async getSummary(): Promise<any> {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const productCount = await Product.count({ where: { status: 'active' } });
    const lowStockCount = await Product.count({
      where: { status: 'active', quantity: { [Op.lte]: col('min_quantity') } }
    });
    const salesMonth =
      (await Sale.sum('total_amount', {
        where: { createdAt: { [Op.gte]: startOfMonth }, status: { [Op.notIn]: ['canceled'] } }
      })) || 0;
    const salesCount = await Sale.count({
      where: { createdAt: { [Op.gte]: startOfMonth }, status: { [Op.notIn]: ['canceled'] } }
    });
    const pq =
      (await Purchase.sum('total_amount', {
        where: { status: { [Op.in]: ['pending', 'approved', 'sent', 'partial'] } }
      })) || 0;
    const clientCount = await Client.count({ where: { status: 'active' } });
    const pOrderCount = await ProductionOrder.count({
      where: { status: { [Op.in]: ['planned', 'released', 'in_progress'] } }
    });
    const ar = (await AccountReceivable.sum('amount', { where: { status: 'pending' } })) || 0;
    const ap = (await AccountPayable.sum('amount', { where: { status: 'pending' } })) || 0;

    return {
      products: { total: productCount, low_stock: lowStockCount },
      sales: { month_total: salesMonth, month_count: salesCount },
      purchases: { pending_total: pq },
      clients: { total: clientCount },
      production: { open_orders: pOrderCount },
      financial: { pending_receivable: ar, pending_payable: ap, projected_balance: ar - ap }
    };
  }

  /**
   * Bloco 3.3 (UC-40, docs/governance/TODO.md) — resumo por área do
   * semáforo de handoff. SQL parametrizado leve (sem interpolação de
   * strings de usuário — os únicos parâmetros dinâmicos são listas fixas
   * de status), mesmo padrão de `getCockpitMetrics`
   * (`SequelizePurchaseRepository`).
   *
   * @inheritdoc
   */
  public async getHandoffsSummary(): Promise<any> {
    const [receivingRow] = await sequelize.query(
      `SELECT COUNT(*)::int AS count
       FROM purchase_orders
       WHERE status IN (:pendingStatuses)`,
      { replacements: { pendingStatuses: ['sent', 'approved', 'partial'] }, type: QueryTypes.SELECT }
    );

    const [requisitionsRow] = await sequelize.query(
      `SELECT COUNT(*)::int AS count
       FROM purchase_requisitions
       WHERE status = :pendingStatus`,
      { replacements: { pendingStatus: 'pending' }, type: QueryTypes.SELECT }
    );

    const [shippingRow] = await sequelize.query(
      `SELECT COUNT(*)::int AS count
       FROM sales
       WHERE status = :invoicedStatus`,
      { replacements: { invoicedStatus: 'invoiced' }, type: QueryTypes.SELECT }
    );

    const [quarantineRow] = await sequelize.query(
      `SELECT COUNT(*)::int AS count
       FROM lot_controls
       WHERE status = :quarantineStatus`,
      { replacements: { quarantineStatus: 'quarantine' }, type: QueryTypes.SELECT }
    );

    const [openRncRow] = await sequelize.query(
      `SELECT COUNT(*)::int AS count
       FROM non_conformities
       WHERE status IN (:openStatuses)`,
      { replacements: { openStatuses: ['open', 'analysis'] }, type: QueryTypes.SELECT }
    );

    return {
      recebimento: { pending: receivingRow?.count ?? 0 },
      requisicoes: { awaiting_approval: requisitionsRow?.count ?? 0 },
      expedicao: { ready_to_ship: shippingRow?.count ?? 0 },
      qualidade: { quarantine: quarantineRow?.count ?? 0, open_rncs: openRncRow?.count ?? 0 },
    };
  }
}

export = SequelizeDashboardRepository;
