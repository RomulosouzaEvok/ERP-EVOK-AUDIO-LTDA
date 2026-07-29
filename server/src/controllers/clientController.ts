const { Client, Sale } = require('../models/index');
const { Op } = require('sequelize');
const Validators = require('../utils/validators');

/**
 * GET /api/clients
 * Lista clientes com paginação e busca.
 */
exports.list = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { page = '1', limit = '10', search, status } = req.query;
    const where: any = {};
    if (search) {
      const sanitized = Validators.sanitizeSearch(search);
      where[Op.or] = [
        { name: { [Op.like]: `%${sanitized}%` } },
        { cpf_cnpj: { [Op.like]: `%${sanitized}%` } },
        { email: { [Op.like]: `%${sanitized}%` } }
      ];
    }
    if (status) where.status = status;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    const { count, rows } = await Client.findAndCountAll({ where, limit: limitNum, offset, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: rows, pagination: { total: count, page: pageNum, limit: limitNum, totalPages: Math.ceil(count / limitNum) } });
  } catch (error) { next(error); }
};

exports.getById = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const customer = await Client.findByPk(req.params.id);
    if (!customer) { res.status(404).json({ success: false, error: 'Cliente não encontrado' }); return; }
    res.json({ success: true, data: customer });
  } catch (error) { next(error); }
};

exports.create = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { name, cpf_cnpj, phone, email, address, notes, tax_regime, ie, im, city, state, cep, street, number, complement, neighborhood } = req.body;
    if (!name || !cpf_cnpj) { res.status(400).json({ success: false, error: 'Nome e CPF/CNPJ são obrigatórios' }); return; }
    const docValidation = Validators.validateDocument(cpf_cnpj);
    if (!docValidation.valid) { res.status(400).json({ success: false, error: `Documento inválido: ${docValidation.error}` }); return; }
    const cleanedDoc = cpf_cnpj.replace(/[^\d]/g, '');
    const customer = await Client.create({ name, cpf_cnpj: cleanedDoc, phone, email, cep, street, number, complement, neighborhood, city, state, notes, tax_regime, ie, im, status: 'active' });
    res.status(201).json({ success: true, data: customer });
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') { res.status(409).json({ success: false, error: 'CPF/CNPJ já cadastrado' }); return; }
    next(error);
  }
};

exports.update = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const allowedFields = ['name', 'phone', 'email', 'notes', 'tax_regime', 'ie', 'im', 'status', 'cep', 'street', 'number', 'complement', 'neighborhood', 'city', 'state'];
    const updateData: any = {};
    for (const field of allowedFields) { if (req.body[field] !== undefined) updateData[field] = req.body[field]; }
    const [updated] = await Client.update(updateData, { where: { id: req.params.id } });
    if (!updated) { res.status(404).json({ success: false, error: 'Cliente não encontrado' }); return; }
    const customer = await Client.findByPk(req.params.id);
    res.json({ success: true, data: customer });
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') { res.status(409).json({ success: false, error: 'CPF/CNPJ já cadastrado' }); return; }
    next(error);
  }
};

exports.remove = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const activeSales = await Sale.count({ where: { customer_id: req.params.id, status: { [Op.in]: ['quote', 'confirmed', 'invoiced'] } } });
    if (activeSales > 0) { res.status(400).json({ success: false, error: `Cliente possui ${activeSales} venda(s) ativa(s). Não é possível inativar.` }); return; }
    const [updated] = await Client.update({ status: 'inactive' }, { where: { id: req.params.id } });
    if (!updated) { res.status(404).json({ success: false, error: 'Cliente não encontrado' }); return; }
    res.json({ success: true, data: { message: 'Cliente inativado com sucesso' } });
  } catch (error) { next(error); }
};

