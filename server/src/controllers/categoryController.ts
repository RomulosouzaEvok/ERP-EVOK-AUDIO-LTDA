const { Category } = require('../models/index');
const { Op } = require('sequelize');

exports.list = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const categories = await Category.findAll({ where: { active: true }, order: [['name', 'ASC']] });
    res.json({ success: true, data: categories });
  } catch (error) { next(error); }
};
exports.getById = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const cat = await Category.findByPk(req.params.id);
    if (!cat) { res.status(404).json({ success: false, error: 'Categoria não encontrada' }); return; }
    res.json({ success: true, data: cat });
  } catch (error) { next(error); }
};
exports.create = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { name, description } = req.body;
    if (!name) { res.status(400).json({ success: false, error: 'Nome é obrigatório' }); return; }
    const cat = await Category.create({ name, description, active: true });
    res.status(201).json({ success: true, data: cat });
  } catch (error: any) { if (error.name === 'SequelizeUniqueConstraintError') { res.status(409).json({ success: false, error: 'Categoria já existe' }); return; } next(error); }
};
exports.update = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { name, description, active } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (active !== undefined) updateData.active = active;
    const [u] = await Category.update(updateData, { where: { id: req.params.id } });
    if (!u) { res.status(404).json({ success: false, error: 'Categoria não encontrada' }); return; }
    res.json({ success: true, data: await Category.findByPk(req.params.id) });
  } catch (error: any) { if (error.name === 'SequelizeUniqueConstraintError') { res.status(409).json({ success: false, error: 'Categoria já existe' }); return; } next(error); }
};
exports.remove = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const [u] = await Category.update({ active: false }, { where: { id: req.params.id } });
    if (!u) { res.status(404).json({ success: false, error: 'Categoria não encontrada' }); return; }
    res.json({ success: true, data: { message: 'Categoria inativada com sucesso' } });
  } catch (error) { next(error); }
};

