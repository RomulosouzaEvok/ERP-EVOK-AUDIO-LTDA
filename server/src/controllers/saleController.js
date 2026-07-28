const { Sale, SaleItem, Product, Client, AccountReceivable, InventoryMovement } = require('../models/index');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, start_date, end_date, customer_id } = req.query;
    const where = {};

    if (status) where.status = status;
    if (customer_id) where.customer_id = customer_id;
    if (start_date || end_date) {
      where.createdAt = {};
      if (start_date) where.createdAt[Op.gte] = new Date(start_date);
      if (end_date) where.createdAt[Op.lte] = new Date(end_date);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Sale.findAndCountAll({
      where,
      include: [
        { model: Client, as: 'customer', attributes: ['id', 'name'] },
        { model: SaleItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    const salesWithCount = rows.map(s => ({
      ...s.toJSON(),
      items_count: s.items ? s.items.length : 0
    }));

    res.json({
      success: true,
      data: salesWithCount,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const sale = await Sale.findByPk(req.params.id, {
      include: [
        { model: Client, as: 'customer', attributes: ['id', 'name', 'cpf_cnpj', 'phone', 'email'] },
        { model: SaleItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] }
      ]
    });
    if (!sale) return res.status(404).json({ success: false, error: 'Venda não encontrada' });
    res.json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { customer_id, items, discount = 0, payment_method, installments = 1, notes } = req.body;

    if (!customer_id) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Cliente é obrigatório' });
    }
    if (!items || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Adicione pelo menos um item à venda' });
    }
    if (installments < 1) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Número de parcelas deve ser maior ou igual a 1' });
    }
    const parsedDiscount = parseFloat(discount) || 0;
    if (parsedDiscount < 0) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Desconto não pode ser negativo' });
    }

    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      if (!item.product_id || item.quantity === undefined || item.unit_price === undefined) {
        await t.rollback();
        return res.status(400).json({ success: false, error: 'Cada item deve ter product_id, quantity e unit_price' });
      }
      const qty = parseInt(item.quantity);
      if (qty <= 0) {
        await t.rollback();
        return res.status(400).json({ success: false, error: 'Quantidade deve ser maior que zero' });
      }
      const unitPrice = parseFloat(item.unit_price);
      if (unitPrice <= 0) {
        await t.rollback();
        return res.status(400).json({ success: false, error: 'Preço unitário deve ser maior que zero' });
      }

      const product = await Product.findByPk(item.product_id, { transaction: t });
      if (!product) {
        await t.rollback();
        return res.status(404).json({ success: false, error: `Produto ID ${item.product_id} não encontrado` });
      }
      if (product.status !== 'active') {
        await t.rollback();
        return res.status(400).json({ success: false, error: `Produto ${product.name} está inativo` });
      }
      if (product.quantity < qty) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: `Estoque insuficiente para ${product.name}. Disponível: ${product.quantity}`
        });
      }
      const totalPrice = qty * unitPrice;
      totalAmount += totalPrice;
      processedItems.push({ product_id: item.product_id, quantity: qty, unit_price: unitPrice, total_price: totalPrice });
    }

    if (parsedDiscount > totalAmount) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Desconto não pode ser maior que o valor total' });
    }

    const sale = await Sale.create({
      customer_id, user_id: req.user.id,
      total_amount: totalAmount - parsedDiscount, discount: parsedDiscount,
      status: 'confirmed', payment_method, installments, notes
    }, { transaction: t });

    // Create sale items
    for (const item of processedItems) {
      await SaleItem.create({
        sale_id: sale.id, product_id: item.product_id,
        quantity: item.quantity, unit_price: item.unit_price, total_price: item.total_price
      }, { transaction: t });

      // Update stock
      await Product.update({ quantity: sequelize.literal(`quantity - ${item.quantity}`) }, { where: { id: item.product_id }, transaction: t });

      // Inventory movement
      await InventoryMovement.create({
        product_id: item.product_id, user_id: req.user.id, type: 'out',
        quantity: item.quantity,
        description: `Venda #${sale.id} - ${payment_method}`,
        reference_id: sale.id, reference_type: 'sale'
      }, { transaction: t });
    }

// Generate accounts receivable
    const totalNet = totalAmount - parsedDiscount;
    if (installments > 1) {
      const baseInstallment = Math.floor((totalNet / installments) * 100) / 100;
      const remainder = Math.round((totalNet - baseInstallment * installments) * 100) / 100;
      const today = new Date();
      const day = today.getDate();
      for (let i = 1; i <= installments; i++) {
        // Calculate next month safely - avoid JS date overflow (e.g., Jan 31 + 1 month = Mar 3)
        const nextMonth = today.getMonth() + i;
        const year = today.getFullYear() + Math.floor(nextMonth / 12);
        const month = nextMonth % 12;
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        const safeDay = Math.min(day, lastDayOfMonth);
        const dueDate = new Date(year, month, safeDay);
        const amount = i === installments ? parseFloat((baseInstallment + remainder).toFixed(2)) : baseInstallment;
        await AccountReceivable.create({
          sale_id: sale.id, customer_id, installment: i,
          amount, due_date: dueDate, status: 'pending'
        }, { transaction: t });
      }
    } else {
      await AccountReceivable.create({
        sale_id: sale.id, customer_id, installment: 1,
        amount: totalNet, due_date: new Date(), status: 'paid',
        payment_date: new Date(), payment_method
      }, { transaction: t });
    }

    await t.commit();

    const fullSale = await Sale.findByPk(sale.id, {
      include: [
        { model: Client, as: 'customer', attributes: ['id', 'name'] },
        { model: SaleItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] }
      ]
    });

    res.status(201).json({ success: true, data: fullSale });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { status } = req.body;
    if (!status) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Status é obrigatório' });
    }

    const validTransitions = {
      'quote': ['confirmed', 'canceled'],
      'confirmed': ['invoiced', 'canceled'],
      'invoiced': ['canceled'],
      'canceled': []
    };

    const sale = await Sale.findByPk(req.params.id, {
      include: [{ model: SaleItem, as: 'items' }],
      transaction: t
    });
    if (!sale) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Venda não encontrada' });
    }

    const allowed = validTransitions[sale.status] || [];
    if (!allowed.includes(status)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: `Transição de status inválida: ${sale.status} → ${status}. Permitidas: ${allowed.join(', ') || 'nenhuma'}`
      });
    }

    if (sale.status === status) {
      await t.rollback();
      return res.status(400).json({ success: false, error: `Venda já está com status ${status}` });
    }

    if (status === 'canceled') {
      for (const item of sale.items) {
        await Product.update({ quantity: sequelize.literal(`quantity + ${item.quantity}`) }, { where: { id: item.product_id }, transaction: t });
        await InventoryMovement.create({
          product_id: item.product_id, user_id: req.user.id, type: 'in',
          quantity: item.quantity,
          description: `Cancelamento venda #${sale.id} - estoque restaurado`,
          reference_id: sale.id, reference_type: 'adjustment'
        }, { transaction: t });
      }
      await AccountReceivable.update({ status: 'canceled' }, {
        where: { sale_id: sale.id, status: { [Op.notIn]: ['paid', 'canceled'] } },
        transaction: t
      });
    }

    sale.status = status;
    await sale.save({ transaction: t });
    await t.commit();

    res.json({ success: true, data: sale });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};
