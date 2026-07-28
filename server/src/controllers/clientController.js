const { Client } = require('../models/index');
const { Op } = require('sequelize');
const Validators = require('../utils/validators');

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const where = {};

    if (search) {
      const sanitized = Validators.sanitizeSearch(search);
      where[Op.or] = [
        { name: { [Op.like]: `%${sanitized}%` } },
        { cpf_cnpj: { [Op.like]: `%${sanitized}%` } },
        { email: { [Op.like]: `%${sanitized}%` } }
      ];
    }
    if (status) where.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Client.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: Validators.sanitizeError(error, 'Erro ao listar clientes') });
  }
};

exports.getById = async (req, res) => {
  try {
    const customer = await Client.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ success: false, error: 'Cliente não encontrado' });
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, error: Validators.sanitizeError(error, 'Erro ao buscar cliente') });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, cpf_cnpj, phone, email, address, notes, tax_regime, ie, im, city, state, cep, street, number, complement, neighborhood } = req.body;

    if (!name || !cpf_cnpj) {
      return res.status(400).json({ success: false, error: 'Nome e CPF/CNPJ são obrigatórios' });
    }

    // Valida CPF/CNPJ
    const docValidation = Validators.validateDocument(cpf_cnpj);
    if (!docValidation.valid) {
      return res.status(400).json({ success: false, error: `Documento inválido: ${docValidation.error}` });
    }

    // Remove formatação para armazenar apenas números
    const cleanedDoc = cpf_cnpj.replace(/[^\d]/g, '');

    const customer = await Client.create({
      name, cpf_cnpj: cleanedDoc, phone, email,
      cep, street, number, complement, neighborhood, city, state,
      notes, tax_regime, ie, im,
      status: 'active'
    });
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: 'CPF/CNPJ já cadastrado' });
    }
    res.status(500).json({ success: false, error: Validators.sanitizeError(error, 'Erro ao criar cliente') });
  }
};

exports.update = async (req, res) => {
  try {
    const allowedFields = ['name', 'phone', 'email', 'notes', 'tax_regime', 'ie', 'im', 'status',
      'cep', 'street', 'number', 'complement', 'neighborhood', 'city', 'state'];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }

    const [updated] = await Client.update(updateData, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ success: false, error: 'Cliente não encontrado' });

    const customer = await Client.findByPk(req.params.id);
    res.json({ success: true, data: customer });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: 'CPF/CNPJ já cadastrado' });
    }
    res.status(500).json({ success: false, error: Validators.sanitizeError(error, 'Erro ao atualizar cliente') });
  }
};

exports.remove = async (req, res) => {
  try {
    const { Sale } = require('../models/index');
    const activeSales = await Sale.count({ where: { customer_id: req.params.id, status: { [Op.in]: ['quote', 'confirmed', 'invoiced'] } } });
    if (activeSales > 0) {
      return res.status(400).json({ success: false, error: `Cliente possui ${activeSales} venda(s) ativa(s). Não é possível inativar.` });
    }
    const [updated] = await Client.update({ status: 'inactive' }, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ success: false, error: 'Cliente não encontrado' });
    res.json({ success: true, data: { message: 'Cliente inativado com sucesso' } });
  } catch (error) {
    res.status(500).json({ success: false, error: Validators.sanitizeError(error, 'Erro ao inativar cliente') });
  }
};

