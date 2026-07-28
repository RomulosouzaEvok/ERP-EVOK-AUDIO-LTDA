const { Supplier } = require('../models/index');
const { Op } = require('sequelize');
const Validators = require('../utils/validators');

exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const where = {};
    if (search) {
      const sanitized = Validators.sanitizeSearch(search);
      where[Op.or] = [
        { company_name: { [Op.like]: `%${sanitized}%` } },
        { cnpj: { [Op.like]: `%${sanitized}%` } }
      ];
    }
    if (status) where.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Supplier.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['company_name', 'ASC']]
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) }
    });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, error: 'Fornecedor não encontrado' });
    res.json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const {
      company_name, trade_name, cnpj, ie, phone, email, address,
      contact_name, contact_phone, payment_terms, delivery_time, notes
    } = req.body;

    if (!company_name || !cnpj) {
      return res.status(400).json({ success: false, error: 'Razão social e CNPJ são obrigatórios' });
    }

    // Valida CNPJ
    const docValidation = Validators.validateDocument(cnpj);
    if (!docValidation.valid) {
      return res.status(400).json({ success: false, error: `CNPJ inválido: ${docValidation.error}` });
    }

    const cleanedCNPJ = cnpj.replace(/[^\d]/g, '');

    const supplier = await Supplier.create({
      company_name, trade_name, cnpj: cleanedCNPJ, ie, phone, email,
      contact_name, contact_phone, payment_terms,
      delivery_time: delivery_time || 15,
      rating: 3, status: 'active', notes
    });
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: 'CNPJ já cadastrado' });
    }
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const allowedFields = [
      'company_name', 'trade_name', 'ie', 'phone', 'email',
      'cep', 'street', 'number', 'complement', 'neighborhood', 'city', 'state',
      'contact_name', 'contact_phone', 'payment_terms', 'delivery_time', 'rating', 'notes'
    ];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }

    const [updated] = await Supplier.update(updateData, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ success: false, error: 'Fornecedor não encontrado' });

    const supplier = await Supplier.findByPk(req.params.id);
    res.json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { Purchase } = require('../models/index');
    const pendingPurchases = await Purchase.count({
      where: {
        supplier_id: req.params.id,
        status: { [Op.in]: ['pending', 'approved', 'sent', 'partial'] }
      }
    });
    if (pendingPurchases > 0) {
      return res.status(400).json({
        success: false,
        error: `Fornecedor possui ${pendingPurchases} pedido(s) de compra pendente(s).`
      });
    }
    const [updated] = await Supplier.update({ status: 'inactive' }, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ success: false, error: 'Fornecedor não encontrado' });
    res.json({ success: true, data: { message: 'Fornecedor inativado com sucesso' } });
  } catch (error) {
    next(error);
  }
};

