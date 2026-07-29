const { AccountReceivable, AccountPayable, Client, Sale, Supplier } = require('../models/index');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { logAction } = require('../services/auditLogService');

exports.listReceivable = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { status, start_date, end_date, customer_id, page = '1', limit = '10' } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (customer_id) where.customer_id = customer_id;
    if (start_date || end_date) { where.due_date = {}; if (start_date) where.due_date[Op.gte] = start_date; if (end_date) where.due_date[Op.lte] = end_date; }
    const p = parseInt(page), l = parseInt(limit), o = (p - 1) * l;
    const { count, rows } = await AccountReceivable.findAndCountAll({ where, include: [{ model: Client, as: 'customer', attributes: ['id', 'name'] }, { model: Sale, as: 'sale', attributes: ['id', 'total_amount', 'status'] }], limit: l, offset: o, order: [['due_date', 'ASC']] });
    res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) } });
  } catch (error) { next(error); }
};
exports.receivePayment = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { payment_date, payment_method, amount } = req.body;
    const account = await AccountReceivable.findByPk(req.params.id);
    if (!account) { res.status(404).json({ success: false, error: 'Conta a receber não encontrada' }); return; }
    if (account.status === 'paid') { res.status(400).json({ success: false, error: 'Conta já foi paga' }); return; }
    if (account.status === 'canceled') { res.status(400).json({ success: false, error: 'Conta cancelada' }); return; }
    const prev = account.status;
    if (amount !== undefined) { const pa = parseFloat(amount); if (pa <= 0) { res.status(400).json({ success: false, error: 'Valor deve ser maior que zero' }); return; } if (pa > parseFloat(account.amount)) { res.status(400).json({ success: false, error: `Valor (R$ ${pa}) excede o valor da conta (R$ ${account.amount})` }); return; } account.amount = pa; }
    account.payment_date = payment_date || new Date();
    account.payment_method = payment_method || account.payment_method;
    account.status = 'paid';
    await account.save();
    logAction(req, { action: 'status_change', entityType: 'AccountReceivable', entityId: account.id, entityDescription: `Conta a receber #${account.id}`, oldValues: { status: prev }, newValues: { status: 'paid', amount: account.amount }, description: `Conta a receber #${account.id} recebida` });
    res.json({ success: true, data: account });
  } catch (error) { next(error); }
};
exports.listPayable = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { status, start_date, end_date, page = '1', limit = '10' } = req.query;
    const where: any = {}; if (status) where.status = status;
    if (start_date || end_date) { where.due_date = {}; if (start_date) where.due_date[Op.gte] = start_date; if (end_date) where.due_date[Op.lte] = end_date; }
    const p = parseInt(page), l = parseInt(limit), o = (p - 1) * l;
    const { count, rows } = await AccountPayable.findAndCountAll({ where, limit: l, offset: o, order: [['due_date', 'ASC']] });
    res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) } });
  } catch (error) { next(error); }
};
exports.createPayable = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { description, amount, due_date, category, supplier_id, purchase_id, notes } = req.body;
    if (!description || amount === undefined || !due_date) { res.status(400).json({ success: false, error: 'Descrição, valor e data de vencimento são obrigatórios' }); return; }
    if (parseFloat(amount) <= 0) { res.status(400).json({ success: false, error: 'Valor deve ser maior que zero' }); return; }
    const account = await AccountPayable.create({ description, amount, due_date, category, supplier_id, purchase_id, notes, status: 'pending' });
    logAction(req, { action: 'create', entityType: 'AccountPayable', entityId: account.id, entityDescription: description, newValues: { description, amount, due_date, status: 'pending' }, description: `Conta a pagar "${description}" criada` });
    res.status(201).json({ success: true, data: account });
  } catch (error) { next(error); }
};
exports.payPayable = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { payment_date, payment_method, amount } = req.body;
    const account = await AccountPayable.findByPk(req.params.id);
    if (!account) { res.status(404).json({ success: false, error: 'Conta a pagar não encontrada' }); return; }
    if (account.status === 'paid') { res.status(400).json({ success: false, error: 'Conta já foi paga' }); return; }
    if (account.status === 'canceled') { res.status(400).json({ success: false, error: 'Conta cancelada' }); return; }
    const prev = account.status;
    if (amount !== undefined) { const pa = parseFloat(amount); if (pa <= 0) { res.status(400).json({ success: false, error: 'Valor deve ser maior que zero' }); return; } if (pa > parseFloat(account.amount)) { res.status(400).json({ success: false, error: `Valor (R$ ${pa}) excede o valor da conta (R$ ${account.amount})` }); return; } account.amount = pa; }
    account.payment_date = payment_date || new Date();
    account.payment_method = payment_method || account.payment_method;
    account.status = 'paid';
    await account.save();
    logAction(req, { action: 'status_change', entityType: 'AccountPayable', entityId: account.id, entityDescription: account.description, oldValues: { status: prev }, newValues: { status: 'paid', amount: account.amount }, description: `Conta a pagar "${account.description}" paga` });
    res.json({ success: true, data: account });
  } catch (error) { next(error); }
};
exports.cashFlow = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { start_date, end_date } = req.query;
    const start = start_date ? new Date(start_date) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = end_date ? new Date(end_date) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    const receivable = await AccountReceivable.findAll({ where: { due_date: { [Op.between]: [start, end] } }, attributes: ['status', [sequelize.fn('SUM', sequelize.col('amount')), 'total']], group: ['status'], raw: true });
    const payable = await AccountPayable.findAll({ where: { due_date: { [Op.between]: [start, end] } }, attributes: ['status', [sequelize.fn('SUM', sequelize.col('amount')), 'total']], group: ['status'], raw: true });
    const pR = receivable.filter((r: any) => r.status === 'pending').reduce((a: number, r: any) => a + parseFloat(r.total || 0), 0);
    const pP = payable.filter((p: any) => p.status === 'pending').reduce((a: number, p: any) => a + parseFloat(p.total || 0), 0);
    const tR = receivable.reduce((a: number, r: any) => a + parseFloat(r.total || 0), 0);
    const tP = payable.reduce((a: number, p: any) => a + parseFloat(p.total || 0), 0);
    res.json({ success: true, data: { period: { start, end }, summary: { total_receivable: tR, total_payable: tP, pending_receivable: pR, pending_payable: pP, projected_balance: pR - pP, actual_balance: tR - tP }, receivable_by_status: receivable, payable_by_status: payable } });
  } catch (error) { next(error); }
};

