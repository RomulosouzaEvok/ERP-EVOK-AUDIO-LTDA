/**
 * Implementacao Sequelize do repositorio do Auditor Inteligente.
 *
 * @module modules/intelligentAuditor/infrastructure/sequelize/SequelizeIntelligentAuditorRepository
 */

import IntelligentAuditorRepository from '../../domain/repositories/IntelligentAuditorRepository';
const { Op }: any = require('sequelize');
const { Product, Sale, Purchase, InventoryMovement, AccountReceivable, AccountPayable }: any = require('../../../../models/index');
const { sequelize }: any = require('../../../../config/database');

class SequelizeIntelligentAuditorRepository extends IntelligentAuditorRepository {
  /** @inheritdoc */
  public async auditStock(): Promise<any> {
    const negative = await Product.findAll({
      where: { quantity: { [Op.lt]: 0 } },
      attributes: ['id', 'name', 'code', 'quantity'],
      raw: true
    });
    const positiveStock = await Product.findAll({ where: { quantity: { [Op.gt]: 0 } }, raw: true });
    const noMovementProducts: any[] = [];
    for (const p of positiveStock) {
      const m = await InventoryMovement.findOne({ where: { product_id: p.id }, raw: true });
      if (!m) noMovementProducts.push(p);
    }
    return {
      negative_stock: negative,
      no_movement: noMovementProducts,
      summary: {
        total_negative: negative.length,
        total_no_movement: noMovementProducts.length,
        products_audited: await Product.count()
      }
    };
  }

  /** @inheritdoc */
  public async auditSales(): Promise<any> {
    const incomplete = await Sale.findAll({
      where: { status: 'confirmed' },
      include: [{ model: require('../../../../models/AccountReceivable'), as: 'accounts_receivable', required: false }],
      raw: true
    });
    const withoutItems = await Sale.findAll({
      where: { '$items.id$': null },
      include: [{ model: require('../../../../models/SaleItem'), as: 'items', required: false, attributes: [] }],
      raw: true
    });
    return { incomplete_receivables: incomplete.length, sales_without_items: withoutItems.length };
  }

  /** @inheritdoc */
  public async auditPurchases(): Promise<any> {
    const pendingLong = await Purchase.findAll({
      where: {
        status: { [Op.in]: ['pending', 'approved'] },
        createdAt: { [Op.lte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      },
      attributes: ['id', 'order_number', 'total_amount', 'createdAt', 'status'],
      raw: true
    });
    return { purchases_stalled: pendingLong.length, details: pendingLong };
  }

  /** @inheritdoc */
  public async auditFinancial(): Promise<any> {
    const overdueReceivable = await AccountReceivable.findAll({
      where: { status: 'pending', due_date: { [Op.lt]: new Date() } },
      include: [{ model: require('../../../../models/Client'), as: 'customer', attributes: ['id', 'name'] }],
      raw: true
    });
    const overduePayable = await AccountPayable.findAll({
      where: { status: 'pending', due_date: { [Op.lt]: new Date() } },
      raw: true
    });
    const recSum = await AccountReceivable.findAll({
      attributes: ['status', [sequelize.fn('SUM', sequelize.col('amount')), 'total']],
      group: ['status'],
      raw: true
    });
    const paySum = await AccountPayable.findAll({
      attributes: ['status', [sequelize.fn('SUM', sequelize.col('amount')), 'total']],
      group: ['status'],
      raw: true
    });
    return {
      overdue_receivable: {
        count: overdueReceivable.length,
        total: overdueReceivable.reduce((a: number, r: any) => a + parseFloat(r.amount || 0), 0)
      },
      overdue_payable: {
        count: overduePayable.length,
        total: overduePayable.reduce((a: number, p: any) => a + parseFloat(p.amount || 0), 0)
      },
      receivable_by_status: recSum,
      payable_by_status: paySum
    };
  }
}

export = SequelizeIntelligentAuditorRepository;
