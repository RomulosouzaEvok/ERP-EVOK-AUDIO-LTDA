const { Department, Employee } = require('../models/index');

exports.list = async (req, res) => {
  try {
    const { only_active } = req.query;
    const where = {};
    if (only_active === 'true') where.active = true;

    const departments = await Department.findAll({
      where,
      include: [{ model: Employee, as: 'manager', attributes: ['id', 'name'] }],
      order: [['code', 'ASC']]
    });

    const departmentsWithCount = await Promise.all(departments.map(async (dept) => {
      const employeeCount = await Employee.count({ where: { department_id: dept.id, status: 'active' } });
      return { ...dept.toJSON(), employee_count: employeeCount };
    }));

    res.json({ success: true, data: departmentsWithCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id, {
      include: [{ model: Employee, as: 'manager', attributes: ['id', 'name'] }]
    });
    if (!department) return res.status(404).json({ success: false, error: 'Departamento não encontrado' });

    const employeeCount = await Employee.count({ where: { department_id: department.id, status: 'active' } });
    res.json({ success: true, data: { ...department.toJSON(), employee_count: employeeCount } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { code, name, sigla, description, manager_id } = req.body;
    if (!code || !name || !sigla) return res.status(400).json({ success: false, error: 'Código, nome e sigla são obrigatórios' });

    const department = await Department.create({ code, name, sigla, description, manager_id, active: true });
    res.status(201).json({ success: true, data: department });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, error: 'Já existe departamento com este código ou sigla' });
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const allowedFields = ['name', 'sigla', 'description', 'manager_id'];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }
    if (req.body.code) return res.status(400).json({ success: false, error: 'Código não pode ser alterado' });

    const [updated] = await Department.update(updateData, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ success: false, error: 'Departamento não encontrado' });

    const department = await Department.findByPk(req.params.id, {
      include: [{ model: Employee, as: 'manager', attributes: ['id', 'name'] }]
    });
    res.json({ success: true, data: department });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const employeeCount = await Employee.count({ where: { department_id: req.params.id, status: 'active' } });
    if (employeeCount > 0) return res.status(400).json({ success: false, error: `Departamento possui ${employeeCount} funcionário(s) ativo(s).` });

    const [updated] = await Department.update({ active: false }, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ success: false, error: 'Departamento não encontrado' });
    res.json({ success: true, data: { message: 'Departamento inativado com sucesso' } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getHierarchy = async (req, res) => {
  try {
    const departments = await Department.findAll({
      where: { active: true },
      include: [{ model: Employee, as: 'manager', attributes: ['id', 'name', 'position'] }],
      order: [['code', 'ASC']]
    });

    const hierarchy = await Promise.all(departments.map(async (dept) => {
      const employees = await Employee.findAll({
        where: { department_id: dept.id, status: 'active' },
        attributes: ['id', 'name', 'position', 'salary', 'shift'],
        order: [['name', 'ASC']]
      });
      return { ...dept.toJSON(), employees };
    }));

    res.json({ success: true, data: hierarchy });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
