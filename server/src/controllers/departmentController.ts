const { Department } = require('../models/index');

exports.list = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const departments = await Department.findAll({ where: { active: true }, order: [['name', 'ASC']] });
    res.json({ success: true, data: departments });
  } catch (error) { next(error); }
};
exports.getById = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const dept = await Department.findByPk(req.params.id);
    if (!dept) { res.status(404).json({ success: false, error: 'Departamento não encontrado' }); return; }
    res.json({ success: true, data: dept });
  } catch (error) { next(error); }
};
exports.create = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { code, name, sigla, description } = req.body;
    if (!code || !name) { res.status(400).json({ success: false, error: 'Código e nome são obrigatórios' }); return; }
    const dept = await Department.create({ code, name, sigla, description, active: true });
    res.status(201).json({ success: true, data: dept });
  } catch (error: any) { if (error.name === 'SequelizeUniqueConstraintError') { res.status(409).json({ success: false, error: 'Código ou nome já existe' }); return; } next(error); }
};
exports.update = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { code, name, sigla, description, active, manager_id } = req.body;
    const updateData: any = {};
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (sigla !== undefined) updateData.sigla = sigla;
    if (description !== undefined) updateData.description = description;
    if (active !== undefined) updateData.active = active;
    if (manager_id !== undefined) updateData.manager_id = manager_id;
    const [u] = await Department.update(updateData, { where: { id: req.params.id } });
    if (!u) { res.status(404).json({ success: false, error: 'Departamento não encontrado' }); return; }
    res.json({ success: true, data: await Department.findByPk(req.params.id) });
  } catch (error: any) { if (error.name === 'SequelizeUniqueConstraintError') { res.status(409).json({ success: false, error: 'Código ou nome já existe' }); return; } next(error); }
};
exports.remove = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const [u] = await Department.update({ active: false }, { where: { id: req.params.id } });
    if (!u) { res.status(404).json({ success: false, error: 'Departamento não encontrado' }); return; }
    res.json({ success: true, data: { message: 'Departamento inativado com sucesso' } });
  } catch (error) { next(error); }
};

