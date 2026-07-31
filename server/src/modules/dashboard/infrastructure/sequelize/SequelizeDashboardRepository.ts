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
  Client
}: any = require('../../../../models/index');
const { Op, col }: any = require('sequelize');

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
}

export = SequelizeDashboardRepository;
