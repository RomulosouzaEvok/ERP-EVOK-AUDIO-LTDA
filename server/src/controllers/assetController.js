const { Asset, Department, Employee, Product } = require('../models/index');
const { Op } = require('sequelize');
const QRCodeService = require('../services/qrCodeService');

// Sanitiza string para busca segura (evita injection via Op.like)
const sanitizeSearch = (str) => str.replace(/[%_]/g, '\\$&');

exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, asset_type, status, department_id } = req.query;
    const where = {};
    if (search) {
      const safe = sanitizeSearch(search);
      where[Op.or] = [
        { name: { [Op.like]: `%${safe}%` } },
        { tag: { [Op.like]: `%${safe}%` } },
        { location: { [Op.like]: `%${safe}%` } }
      ];
    }
    if (asset_type) where.asset_type = asset_type;
    if (status) where.status = status;
    if (department_id) where.department_id = department_id;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Asset.findAndCountAll({
      where, include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'sigla'] }, { model: Employee, as: 'responsible', attributes: ['id', 'name'] }],
      limit: parseInt(limit), offset, order: [['tag', 'ASC']]
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) } });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const asset = await Asset.findByPk(req.params.id, {
      include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'sigla'] }, { model: Employee, as: 'responsible', attributes: ['id', 'name'] }, { model: Product, as: 'product', attributes: ['id', 'name', 'code'] }]
    });
    if (!asset) return res.status(404).json({ success: false, error: 'Patrimônio não encontrado' });
    res.json({ success: true, data: asset });
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const { tag, name, description, asset_type, department_id, responsible_id, location, purchase_date, purchase_value, useful_life_months, product_id, notes } = req.body;
    if (!tag || !name) return res.status(400).json({ success: false, error: 'Tag e nome do patrimônio são obrigatórios' });

    const parsedValue = parseFloat(purchase_value) || 0;
    const asset = await Asset.create({
      tag, name, description, asset_type: asset_type || 'equipment',
      department_id, responsible_id, location,
      purchase_date: purchase_date || null,
      purchase_value: parsedValue,
      current_value: parsedValue,
      useful_life_months: useful_life_months || null,
      product_id, notes, status: 'active'
    });

    try {
      const { qrDataUrl, qrCodeData } = await QRCodeService.generate('asset', asset.id, { name: asset.name, code: asset.code });
      await Asset.update({ qr_code: qrDataUrl, qr_code_data: qrCodeData }, { where: { id: asset.id } });
    } catch (qrError) { console.warn('QR Code generation failed (non-critical):', qrError.message); }

    const fullAsset = await Asset.findByPk(asset.id, { include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'sigla'] }] });
    res.status(201).json({ success: true, data: fullAsset });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, error: 'Código do patrimônio já existe' });
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const allowedFields = ['name', 'description', 'category', 'department_id', 'responsible_id', 'location', 'acquisition_date', 'acquisition_value', 'current_value', 'quantity', 'product_id', 'notes', 'status'];
    const updateData = {};
    for (const field of allowedFields) { if (req.body[field] !== undefined) updateData[field] = req.body[field]; }

    const [updated] = await Asset.update(updateData, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ success: false, error: 'Patrimônio não encontrado' });

    const asset = await Asset.findByPk(req.params.id, { include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'sigla'] }, { model: Employee, as: 'responsible', attributes: ['id', 'name'] }] });
    res.json({ success: true, data: asset });
  } catch (error) { next(error); }
};

exports.remove = async (req, res, next) => {
  try {
    const [updated] = await Asset.update({ status: 'disposed' }, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ success: false, error: 'Patrimônio não encontrado' });
    res.json({ success: true, data: { message: 'Patrimônio baixado com sucesso' } });
  } catch (error) { next(error); }
};

exports.generateQRCode = async (req, res, next) => {
  try {
    const asset = await Asset.findByPk(req.params.id);
    if (!asset) return res.status(404).json({ success: false, error: 'Patrimônio não encontrado' });

    const { qrDataUrl, qrCodeData } = await QRCodeService.generate('asset', asset.id, { name: asset.name, code: asset.code });
    await Asset.update({ qr_code: qrDataUrl, qr_code_data: qrCodeData }, { where: { id: asset.id } });
    res.json({ success: true, data: { qrCode: qrDataUrl, qrCodeData } });
  } catch (error) { next(error); }
};

exports.getByQRCode = async (req, res, next) => {
  try {
    const { qrCodeData } = req.query;
    if (!qrCodeData) return res.status(400).json({ success: false, error: 'Dados do QR Code são obrigatórios' });

    let parsed;
    try { parsed = JSON.parse(qrCodeData); } catch { return res.status(400).json({ success: false, error: 'QR Code inválido' }); }
    if (parsed.type !== 'asset') return res.status(400).json({ success: false, error: 'QR Code não corresponde a um patrimônio' });

    const asset = await Asset.findByPk(parsed.id, { include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'sigla'] }, { model: Employee, as: 'responsible', attributes: ['id', 'name'] }] });
    if (!asset) return res.status(404).json({ success: false, error: 'Patrimônio não encontrado' });
    res.json({ success: true, data: asset });
  } catch (error) { next(error); }
};
