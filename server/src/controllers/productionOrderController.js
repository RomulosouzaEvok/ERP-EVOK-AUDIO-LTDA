const { ProductionOrder, Product, Employee, User } = require('../models/index');
const InventoryService = require('../services/inventoryService');
const BomService = require('../services/bomService');
const ProductionOrderEntity = require('../modules/production/domain/entities/ProductionOrderEntity');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { logAction } = require('../services/auditLogService');

exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, product_id, start_date, end_date, priority } = req.query;
    const where = {};
    if (status) where.status = status;
    if (product_id) where.product_id = product_id;
    if (priority) where.priority = priority;
    if (start_date || end_date) {
      where.createdAt = {};
      if (start_date) where.createdAt[Op.gte] = new Date(start_date);
      if (end_date) where.createdAt[Op.lte] = new Date(end_date);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await ProductionOrder.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code', 'product_type'] },
        { model: Employee, as: 'responsible', attributes: ['id', 'name'] }
      ],
      limit: parseInt(limit), offset, order: [['createdAt', 'DESC']]
    });

    const totals = await Promise.all([
      ProductionOrder.count(),
      ProductionOrder.count({ where: { status: 'planned' } }),
      ProductionOrder.count({ where: { status: 'in_progress' } }),
      ProductionOrder.count({ where: { status: 'completed' } }),
      ProductionOrder.count({ where: { due_date: { [Op.lt]: new Date() }, status: { [Op.notIn]: ['completed', 'canceled'] } } })
    ]);

    res.json({
      success: true, data: rows,
      summary: { total: totals[0], planned: totals[1], in_progress: totals[2], completed: totals[3], overdue: totals[4] },
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) }
    });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const order = await ProductionOrder.findByPk(req.params.id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code', 'product_type'] },
        { model: Employee, as: 'responsible', attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['id', 'name'] }
      ]
    });
    if (!order) return res.status(404).json({ success: false, error: 'Ordem de produção não encontrada' });
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { product_id, quantity, priority, due_date, responsible_id, sales_order_id, notes } = req.body;
    const entity = new ProductionOrderEntity({
      product_id, quantity, priority, due_date, responsible_id, sales_order_id, notes
    });

    const product = await Product.findByPk(product_id, { transaction: t });
    entity.assertCanBeCreatedFor(product);

    const year = new Date().getFullYear();
    const count = await ProductionOrder.count({ where: { order_number: { [Op.like]: `OP-${year}%` } }, transaction: t });
    const order_number = `OP-${year}-${String(count + 1).padStart(4, '0')}`;

    const order = await ProductionOrder.create(
      entity.toCreatePersistence({ order_number, created_by: req.user.id }),
      { transaction: t }
    );

    await t.commit();

    // Log de auditoria feito após o commit para não segurar locks de banco.
    logAction(req, { action: 'create', entityType: 'ProductionOrder', entityId: order.id, entityDescription: order.order_number, newValues: { product_id, quantity, status: 'planned' }, description: `Ordem de produção ${order.order_number} criada` });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    if (req.body.status) return res.status(400).json({ success: false, error: 'Use /:id/status para alterar status' });
    const allowedFields = ['priority', 'due_date', 'responsible_id', 'notes'];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }
    const before = await ProductionOrder.findByPk(req.params.id);
    if (!before) return res.status(404).json({ success: false, error: 'Ordem de produção não encontrada' });
    const oldValues = {};
    for (const field of Object.keys(updateData)) oldValues[field] = before[field];

    const [updated] = await ProductionOrder.update(updateData, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ success: false, error: 'Ordem de produção não encontrada' });
    const order = await ProductionOrder.findByPk(req.params.id, { include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] });

    logAction(req, { action: 'update', entityType: 'ProductionOrder', entityId: order.id, entityDescription: order.order_number, oldValues, newValues: updateData, description: `Ordem de produção ${order.order_number} atualizada` });

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { status, quantity_produced } = req.body;
    if (!status) { await t.rollback(); return res.status(400).json({ success: false, error: 'Status é obrigatório' }); }

    // Lock pessimista na OP: impede que duas requisições concorrentes de
    // finalização (ex.: duplo clique) leiam o mesmo status 'in_progress' e
    // ambas tentem completar a mesma ordem, duplicando entrada de estoque.
    const order = await ProductionOrder.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!order) { await t.rollback(); return res.status(404).json({ success: false, error: 'Ordem de produção não encontrada' }); }

    const previousStatus = order.status;
    const orderNumber = order.order_number;
    const entity = new ProductionOrderEntity(order.get({ plain: true }));
    const updateData = entity.transitionTo(status, quantity_produced);

    if (status === 'completed') {
      const producedQty = updateData.quantity_produced;
      if (producedQty > 0) {
        try {
          // Consome os componentes da BOM ativa do produto acabado, se existir.
          // OPs de produtos sem BOM cadastrada seguem funcionando (apenas dão
          // entrada no produto acabado), pois nem todo produto acabado
          // necessariamente possui BOM registrada nesta fase do projeto.
          let explosion = null;
          try {
            explosion = await BomService.explodeBOM(order.product_id, producedQty, { includeCost: false });
          } catch (bomError) {
            if (bomError.statusCode !== 404) throw bomError;
          }
          if (explosion) {
            for (const component of explosion.components) {
              await InventoryService.consume(component.component_id, component.quantity, t, {
                user_id: req.user.id,
                description: `Consumo de componente - Produção ${order.order_number}`,
                reference_id: order.id,
                reference_type: 'production'
              });
            }
          }

          // Entrada do produto acabado no estoque.
          await InventoryService.receive(order.product_id, producedQty, t, {
            user_id: req.user.id,
            description: `Produção concluída - ${order.order_number}`,
            reference_id: order.id,
            reference_type: 'production'
          });
        } catch (stockError) {
          await t.rollback();
          return res.status(stockError.statusCode || 409).json({ success: false, error: stockError.message });
        }
      }
    }

    await ProductionOrder.update(updateData, { where: { id: req.params.id }, transaction: t });
    await t.commit();

    // Log de auditoria feito após o commit para não segurar locks de banco.
    logAction(req, { action: 'status_change', entityType: 'ProductionOrder', entityId: order.id, entityDescription: orderNumber, oldValues: { status: previousStatus }, newValues: { status, ...(updateData.quantity_produced !== undefined ? { quantity_produced: updateData.quantity_produced } : {}) }, description: `Ordem de produção ${orderNumber}: status alterado de ${previousStatus} para ${status}` });

    const updated = await ProductionOrder.findByPk(req.params.id, { include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] });
    res.json({ success: true, data: updated });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const order = await ProductionOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Ordem de produção não encontrada' });
    if (['in_progress', 'completed'].includes(order.status)) return res.status(400).json({ success: false, error: 'Ordens em andamento ou concluídas não podem ser removidas' });
    await ProductionOrder.destroy({ where: { id: req.params.id } });

    logAction(req, { action: 'delete', entityType: 'ProductionOrder', entityId: order.id, entityDescription: order.order_number, oldValues: { status: order.status }, description: `Ordem de produção ${order.order_number} removida` });

    res.json({ success: true, data: { message: 'Ordem de produção removida com sucesso' } });
  } catch (error) {
    next(error);
  }
};

exports.getProductionReport = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const where = {};
    if (start_date || end_date) {
      where.createdAt = {};
      if (start_date) where.createdAt[Op.gte] = new Date(start_date);
      if (end_date) where.createdAt[Op.lte] = new Date(end_date);
    }

    const orders = await ProductionOrder.findAll({
      where,
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }]
    });

    const totalPlanned = orders.reduce((sum, o) => sum + o.quantity, 0);
    const totalProduced = orders.reduce((sum, o) => sum + (o.quantity_produced || 0), 0);
    const completionRate = totalPlanned > 0 ? (totalProduced / totalPlanned) * 100 : 0;

    const byStatus = { planned: 0, released: 0, in_progress: 0, completed: 0, paused: 0, canceled: 0 };
    orders.forEach(o => { if (byStatus[o.status] !== undefined) byStatus[o.status]++; });

    res.json({ success: true, data: { period: { start_date, end_date }, summary: { total_orders: orders.length, total_planned: totalPlanned, total_produced: totalProduced, completion_rate: `${completionRate.toFixed(2)}%` }, by_status: byStatus, details: orders } });
  } catch (error) {
    next(error);
  }
};
