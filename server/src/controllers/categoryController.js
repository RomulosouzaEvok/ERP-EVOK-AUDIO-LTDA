const { Category, Product } = require('../models/index');
const { sequelize } = require('../config/database');

exports.list = async (req, res) => {
  try {
    const categories = await Category.findAll({
      include: [{ model: Product, as: 'products', attributes: [], required: false }],
      attributes: {
        include: [
          [sequelize.fn('COUNT', sequelize.col('products.id')), 'product_count']
        ]
      },
      group: ['Category.id'],
      order: [['name', 'ASC']]
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ success: false, error: 'Categoria não encontrada' });
    res.json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Nome da categoria é obrigatório' });
    }
    const category = await Category.create({ name, description });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: 'Categoria já existe' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const updateData = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.description !== undefined) updateData.description = req.body.description;

    const [updated] = await Category.update(updateData, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ success: false, error: 'Categoria não encontrada' });

    const category = await Category.findByPk(req.params.id);
    res.json({ success: true, data: category });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: 'Nome da categoria já existe' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const productsCount = await Product.count({ where: { category_id: req.params.id } });
    if (productsCount > 0) {
      return res.status(400).json({ success: false, error: 'Categoria possui produtos vinculados. Remova-os primeiro.' });
    }
    const deleted = await Category.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ success: false, error: 'Categoria não encontrada' });
    res.json({ success: true, data: { message: 'Categoria excluída com sucesso' } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

