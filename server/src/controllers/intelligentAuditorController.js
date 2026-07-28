const { Product, InventoryMovement, Sale, SaleItem, Purchase, PurchaseItem, ProductionOrder } = require('../models/index');
const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/database');

exports.auditReport = async (req, res) => {
  try {
    const products = await Product.findAll({ where: { status: 'active' }, include: ['category'] });
    const anomalies = [], restockSuggestions = [];
    const inventoryAccuracy = { total_products: 0, accurate: 0, warnings: 0, critical: 0 };

    for (const product of products) {
      if (product.quantity < 0) {
        anomalies.push({ type: 'negative_stock', severity: 'critical', product: { id: product.id, name: product.name, code: product.code }, detail: `Estoque negativo: ${product.quantity}`, suggestion: 'Realizar inventário físico imediato e ajuste' });
        inventoryAccuracy.critical++;
        continue;
      }

      if (product.quantity === 0) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentMovements = await InventoryMovement.count({ where: { product_id: product.id, created_at: { [Op.gte]: thirtyDaysAgo } } });
        if (recentMovements > 0) {
          anomalies.push({ type: 'zero_stock_with_movement', severity: 'warning', product: { id: product.id, name: product.name, code: product.code }, detail: `Estoque zerado mas houve ${recentMovements} movimentações nos últimos 30 dias`, suggestion: 'Verificar se o estoque físico está correto' });
          inventoryAccuracy.warnings++;
        }
      }

      if (product.quantity > 0 && product.quantity <= product.min_quantity) {
        const pendingPurchases = await PurchaseItem.count({
          include: [{ model: Purchase, as: 'purchase', where: { status: { [Op.in]: ['pending', 'approved', 'sent', 'partial'] } } }],
          where: { product_id: product.id }
        });
        const pendingProduction = await ProductionOrder.count({ where: { product_id: product.id, status: { [Op.in]: ['planned', 'released', 'in_progress'] } } });

        anomalies.push({
          type: 'low_stock', severity: product.quantity === 0 ? 'critical' : 'warning',
          product: { id: product.id, name: product.name, code: product.code },
          detail: `Estoque (${product.quantity}) abaixo do mínimo (${product.min_quantity})`,
          pending_restock: { purchase_orders: pendingPurchases, production_orders: pendingProduction },
          suggestion: pendingPurchases === 0 && pendingProduction === 0 ? 'Nenhuma reposição em andamento! Criar pedido de compra ou OP urgente.' : `Reposição em andamento: ${pendingPurchases} pedido(s) de compra, ${pendingProduction} OP(s)`
        });
        inventoryAccuracy.warnings++;

        if (pendingPurchases === 0 && pendingProduction === 0) {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const salesItems = await SaleItem.findAll({
            include: [{ model: Sale, as: 'sale', where: { created_at: { [Op.gte]: thirtyDaysAgo } } }],
            where: { product_id: product.id },
            attributes: [[fn('COALESCE', fn('SUM', col('quantity')), 0), 'total']],
            raw: true
          });
          const avgMonthly = salesItems.length > 0 ? parseFloat(salesItems[0].total || 0) : 0;
          restockSuggestions.push({
            product: { id: product.id, name: product.name, code: product.code },
            current_stock: product.quantity, min_quantity: product.min_quantity,
            avg_monthly_consumption: avgMonthly,
            suggested_quantity: Math.max(product.min_quantity * 3 - product.quantity, product.min_quantity),
            priority: product.quantity === 0 ? 'urgent' : 'normal'
          });
        }
      }

      if (product.quantity > product.min_quantity * 5) {
        const lastMovement = await InventoryMovement.findOne({ where: { product_id: product.id }, order: [['created_at', 'DESC']] });
        if (lastMovement) {
          const daysSinceLastMovement = (Date.now() - new Date(lastMovement.created_at).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceLastMovement > 180) {
            anomalies.push({ type: 'excess_stock', severity: 'info', product: { id: product.id, name: product.name, code: product.code }, detail: `Estoque excessivo (${product.quantity}) sem movimentação há ${Math.round(daysSinceLastMovement)} dias`, suggestion: 'Considerar promoção, transferência ou devolução ao fornecedor' });
          }
        }
      }

      inventoryAccuracy.total_products++;
      if (product.quantity >= product.min_quantity) inventoryAccuracy.accurate++;
    }

    const totalStockValue = products.reduce((sum, p) => sum + (parseFloat(p.cost_price || 0) * p.quantity), 0);
    const totalLowStock = products.filter(p => p.quantity > 0 && p.quantity <= p.min_quantity).length;
    const totalOutOfStock = products.filter(p => p.quantity === 0).length;

    res.json({ success: true, data: { generated_at: new Date(), inventory_summary: { total_products: products.length, total_stock_value: totalStockValue, out_of_stock: totalOutOfStock, low_stock: totalLowStock, healthy_stock: products.length - totalOutOfStock - totalLowStock }, inventory_accuracy: { ...inventoryAccuracy, accuracy_rate: `${((inventoryAccuracy.accurate / (inventoryAccuracy.total_products || 1)) * 100).toFixed(1)}%` }, anomalies: { total: anomalies.length, critical: anomalies.filter(a => a.severity === 'critical').length, warning: anomalies.filter(a => a.severity === 'warning').length, info: anomalies.filter(a => a.severity === 'info').length, items: anomalies }, restock_suggestions: restockSuggestions } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.stockValuation = async (req, res) => {
  try {
    const products = await Product.findAll({ where: { status: 'active' }, include: ['category'] });

    const valuation = products.map(p => ({
      id: p.id, name: p.name, code: p.code, quantity: p.quantity,
      unit_cost: p.cost_price || 0, unit_price: p.price || 0,
      total_cost_value: (p.cost_price || 0) * p.quantity,
      total_sale_value: (p.price || 0) * p.quantity,
      profit_margin: p.cost_price ? `${(((p.price || 0) - p.cost_price) / p.cost_price * 100).toFixed(2)}%` : 'N/A',
      status: p.quantity <= p.min_quantity ? 'low_stock' : 'normal'
    }));

    const totalCostValue = valuation.reduce((sum, p) => sum + p.total_cost_value, 0);
    const totalSaleValue = valuation.reduce((sum, p) => sum + p.total_sale_value, 0);

    const sorted = [...valuation].sort((a, b) => b.total_cost_value - a.total_cost_value);
    let cumulative = 0;
    const abcCurve = sorted.map(p => {
      cumulative += p.total_cost_value;
      const percentage = totalCostValue > 0 ? (cumulative / totalCostValue) * 100 : 0;
      return { ...p, cumulative_percentage: parseFloat(percentage.toFixed(2)), abc_class: percentage <= 70 ? 'A' : percentage <= 90 ? 'B' : 'C' };
    });

    res.json({ success: true, data: { generated_at: new Date(), summary: { total_cost_value: totalCostValue, total_sale_value: totalSaleValue, potential_profit: totalSaleValue - totalCostValue, product_count: products.length }, valuation: valuation.sort((a, b) => b.total_cost_value - a.total_cost_value), abc_curve: { class_a: abcCurve.filter(p => p.abc_class === 'A').length, class_b: abcCurve.filter(p => p.abc_class === 'B').length, class_c: abcCurve.filter(p => p.abc_class === 'C').length, items: abcCurve } } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.auditSummary = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [totalProducts, totalMovements, totalSales30d, totalPurchases30d, totalProduction30d, activeAlerts] = await Promise.all([
      Product.count({ where: { status: 'active' } }),
      InventoryMovement.count({ where: { created_at: { [Op.gte]: thirtyDaysAgo } } }),
      Sale.count({ where: { created_at: { [Op.gte]: thirtyDaysAgo } } }),
      PurchaseItem.count({
        include: [{ model: Purchase, as: 'purchase', where: { created_at: { [Op.gte]: thirtyDaysAgo } } }]
      }),
      ProductionOrder.count({ where: { created_at: { [Op.gte]: thirtyDaysAgo } } }),
      Product.count({ where: { status: 'active', quantity: { [Op.lte]: col('min_quantity') } } })
    ]);

    const stockValue = await Product.findAll({
      where: { status: 'active' },
      attributes: [[fn('SUM', literal('cost_price * quantity')), 'total']],
      raw: true
    });

    res.json({ success: true, data: { audited_at: now, period: { start: thirtyDaysAgo, end: now }, overview: { active_products: totalProducts, movements_30d: totalMovements, sales_30d: totalSales30d, purchases_30d: totalPurchases30d, production_30d: totalProduction30d, active_alerts: activeAlerts, stock_value: stockValue.length > 0 ? parseFloat(stockValue[0].total) || 0 : 0 } } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
