const { AccountReceivable, AccountPayable, Client, Sale, Supplier } = require('../models/index');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

exports.listReceivable = async (req, res) => {
  try {
    const { status, start_date, end_date, customer_id, page = 1, limit = 10 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (customer_id) where.customer_id = customer_id;
    if (start_date || end_date) {
      where.due_date = {};
      if (start_date) where.due_date[Op.gte] = start_date;
      if (end_date) where.due_date[Op.lte] = end_date;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await AccountReceivable.findAndCountAll({
      where,
      include: [
        { model: Client, as: 'customer', attributes: ['id', 'name'] },
        { model: Sale, as: 'sale', attributes: ['id', 'total_amount', 'status'] }
      ],
      limit: parseInt(limit), offset, order: [['due_date', 'ASC']]
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.receivePayment = async (req, res) => {
  try {
    const { payment_date, payment_method, amount } = req.body;
    const account = await AccountReceivable.findByPk(req.params.id);
    if (!account) return res.status(404).json({ success: false, error: 'Conta a receber não encontrada' });
    if (account.status === 'paid') return res.status(400).json({ success: false, error: 'Conta já foi paga' });
    if (account.status === 'canceled') return res.status(400).json({ success: false, error: 'Conta cancelada' });

    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (parsedAmount <= 0) return res.status(400).json({ success: false, error: 'Valor deve ser maior que zero' });
      if (parsedAmount > parseFloat(account.amount)) return res.status(400).json({ success: false, error: `Valor (R$ ${parsedAmount}) excede o valor da conta (R$ ${account.amount})` });
      account.amount = parsedAmount;
    }

    account.payment_date = payment_date || new Date();
    account.payment_method = payment_method || account.payment_method;
    account.status = 'paid';
    await account.save();
    res.json({ success: true, data: account });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.listPayable = async (req, res) => {
  try {
    const { status, start_date, end_date, page = 1, limit = 10 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (start_date || end_date) {
      where.due_date = {};
      if (start_date) where.due_date[Op.gte] = start_date;
      if (end_date) where.due_date[Op.lte] = end_date;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await AccountPayable.findAndCountAll({
      where,
      limit: parseInt(limit), offset, order: [['due_date', 'ASC']]
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createPayable = async (req, res) => {
  try {
    const { description, amount, due_date, category, supplier_id, purchase_id, notes } = req.body;
    if (!description || amount === undefined || !due_date) return res.status(400).json({ success: false, error: 'Descrição, valor e data de vencimento são obrigatórios' });
    if (parseFloat(amount) <= 0) return res.status(400).json({ success: false, error: 'Valor deve ser maior que zero' });

    const account = await AccountPayable.create({
      description, amount, due_date, category, supplier_id, purchase_id, notes, status: 'pending'
    });
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.payPayable = async (req, res) => {
  try {
    const { payment_date, payment_method, amount } = req.body;
    const account = await AccountPayable.findByPk(req.params.id);
    if (!account) return res.status(404).json({ success: false, error: 'Conta a pagar não encontrada' });
    if (account.status === 'paid') return res.status(400).json({ success: false, error: 'Conta já foi paga' });
    if (account.status === 'canceled') return res.status(400).json({ success: false, error: 'Conta cancelada' });

    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (parsedAmount <= 0) return res.status(400).json({ success: false, error: 'Valor deve ser maior que zero' });
      if (parsedAmount > parseFloat(account.amount)) return res.status(400).json({ success: false, error: `Valor (R$ ${parsedAmount}) excede o valor da conta (R$ ${account.amount})` });
      account.amount = parsedAmount;
    }

    account.payment_date = payment_date || new Date();
    account.payment_method = payment_method || account.payment_method;
    account.status = 'paid';
    await account.save();
    res.json({ success: true, data: account });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.cashFlow = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const start = start_date ? new Date(start_date) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = end_date ? new Date(end_date) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    const receivable = await AccountReceivable.findAll({
      where: { due_date: { [Op.between]: [start, end] } },
      attributes: ['status', [sequelize.fn('SUM', sequelize.col('amount')), 'total']],
      group: ['status'], raw: true
    });

    const payable = await AccountPayable.findAll({
      where: { due_date: { [Op.between]: [start, end] } },
      attributes: ['status', [sequelize.fn('SUM', sequelize.col('amount')), 'total']],
      group: ['status'], raw: true
    });

    const pendingReceivable = receivable.filter(r => r.status === 'pending').reduce((a, r) => a + parseFloat(r.total || 0), 0);
    const pendingPayable = payable.filter(p => p.status === 'pending').reduce((a, p) => a + parseFloat(p.total || 0), 0);
    const totalReceivable = receivable.reduce((a, r) => a + parseFloat(r.total || 0), 0);
    const totalPayable = payable.reduce((a, p) => a + parseFloat(p.total || 0), 0);

    res.json({
      success: true,
      data: {
        period: { start, end },
        summary: {
          total_receivable: totalReceivable,
          total_payable: totalPayable,
          pending_receivable: pendingReceivable,
          pending_payable: pendingPayable,
          projected_balance: pendingReceivable - pendingPayable,
          actual_balance: totalReceivable - totalPayable
        },
        receivable_by_status: receivable,
        payable_by_status: payable
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
