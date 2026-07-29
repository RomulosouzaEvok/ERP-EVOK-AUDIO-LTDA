const { BillOfMaterial, BillOfMaterialItem, Product } = require('../models/index');
const BomService = require('../services/bomService');
const { Op } = require('sequelize');

exports.list = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { page = '1', limit = '10', status, search, product_id } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (product_id) where.product_id = product_id;
    if (search) { const products = await Product.findAll({ where: { name: { [Op.like]: `%${search}%` } }, attributes: ['id'] }); where.product_id = { [Op.in]: products.map((p: any) => p.id) }; }
    const p = parseInt(page), l = parseInt(limit), o = (p - 1) * l;
    const { count, rows } = await BillOfMaterial.findAndCountAll({ where, include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }], limit: l, offset: o, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) } });
  } catch (error) { next(error); }
};
exports.getById = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const bom = await BillOfMaterial.findByPk(req.params.id, { include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }, { model: BillOfMaterialItem, as: 'items', include: [{ model: Product, as: 'componentProduct', attributes: ['id', 'name', 'code'] }] }] });
    if (!bom) { res.status(404).json({ success: false, error: 'BOM não encontrada' }); return; }
    res.json({ success: true, data: bom });
  } catch (error) { next(error); }
};
exports.create = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { product_id, revision, notes, items } = req.body;
    if (!product_id || !items || items.length === 0) { res.status(400).json({ success: false, error: 'Produto e itens são obrigatórios' }); return; }
    const bom = await BomService.createBOM({ product_id, revision: revision || '00', notes }, items, req.user.id);
    res.status(201).json({ success: true, data: bom });
  } catch (error) { next(error); }
};
exports.update = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const allowedFields = ['revision', 'revision_notes', 'notes', 'status'];
    const updateData: any = {}; for (const f of allowedFields) { if (req.body[f] !== undefined) updateData[f] = req.body[f]; }
    const [u] = await BillOfMaterial.update(updateData, { where: { id: req.params.id } });
    if (!u) { res.status(404).json({ success: false, error: 'BOM não encontrada' }); return; }
    const bom = await BillOfMaterial.findByPk(req.params.id);
    if (updateData.status === 'active') { const { logAction } = require('../services/auditLogService'); logAction(req, { action: 'approve', entityType: 'BOM', entityId: bom.id, entityDescription: `BOM ${bom.product_id} rev ${bom.revision}`, newValues: { status: 'active' }, description: `BOM #${bom.id} aprovada` }); }
    res.json({ success: true, data: bom });
  } catch (error) { next(error); }
};
exports.remove = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const [u] = await BillOfMaterial.update({ status: 'inactive' }, { where: { id: req.params.id, status: { [Op.in]: ['draft', 'active'] } } });
    if (!u) { res.status(404).json({ success: false, error: 'BOM não encontrada ou não pode ser inativada' }); return; }
    res.json({ success: true, data: { message: 'BOM inativada' } });
  } catch (error) { next(error); }
};
exports.getActiveByProduct = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const bom = await BillOfMaterial.findOne({ where: { product_id: req.params.productId, status: 'active' }, include: [{ model: BillOfMaterialItem, as: 'items', include: [{ model: Product, as: 'componentProduct', attributes: ['id', 'name', 'code'] }] }] });
    if (!bom) { res.status(404).json({ success: false, error: 'Nenhuma BOM ativa para este produto' }); return; }
    res.json({ success: true, data: bom });
  } catch (error) { next(error); }
};
exports.listVersions = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const boms = await BillOfMaterial.findAll({ where: { product_id: req.params.productId }, include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }], order: [['createdAt', 'ASC']] });
    res.json({ success: true, data: boms });
  } catch (error) { next(error); }
};
exports.explode = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const qty = parseInt(req.query.qty) || 1;
    const result = await BomService.explodeBOM(parseInt(req.params.id), qty);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};
exports.calculateCost = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const qty = parseInt(req.query.qty) || 1;
    const cost = await BomService.calculateCost(parseInt(req.params.id), qty);
    res.json({ success: true, data: cost });
  } catch (error) { next(error); }
};
exports.checkAvailability = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const qty = parseInt(req.query.qty) || 1;
    const availability = await BomService.checkAvailability(parseInt(req.params.id), qty);
    res.json({ success: true, data: availability });
  } catch (error) { next(error); }
};
exports.getTree = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const tree = await BomService.getBOMTree(parseInt(req.params.id));
    res.json({ success: true, data: tree });
  } catch (error) { next(error); }
};
exports.listItems = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const items = await BillOfMaterialItem.findAll({ where: { bom_id: req.params.id }, include: [{ model: Product, as: 'componentProduct', attributes: ['id', 'name', 'code'] }] });
    res.json({ success: true, data: items });
  } catch (error) { next(error); }
};

