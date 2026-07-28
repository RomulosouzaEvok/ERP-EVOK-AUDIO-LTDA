const { Employee, Department, User } = require('../models/index');
const { Op } = require('sequelize');
const Validators = require('../utils/validators');

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, department_id } = req.query;
    const where = {};
    if (search) {
      const sanitized = Validators.sanitizeSearch(search);
      where[Op.or] = [
        { name: { [Op.like]: `%${sanitized}%` } },
        { cpf: { [Op.like]: `%${sanitized}%` } },
        { email: { [Op.like]: `%${sanitized}%` } }
      ];
    }
    if (status) where.status = status;
    if (department_id) where.department_id = department_id;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Employee.findAndCountAll({
      where,
      attributes: {
        exclude: ['salary', 'bank_name', 'bank_agency', 'bank_account', 'bank_account_type', 'pix_key', 'pis_pasep', 'ctps']
      },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'sigla'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
      ],
      limit: parseInt(limit), offset, order: [['name', 'ASC']]
    });

    res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) } });
  } catch (error) {
    res.status(500).json({ success: false, error: Validators.sanitizeError(error, 'Erro ao listar funcionários') });
  }
};

exports.getById = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id, {
      attributes: { exclude: ['bank_name', 'bank_agency', 'bank_account', 'bank_account_type', 'pix_key'] },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'sigla'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }
      ]
    });
    if (!employee) return res.status(404).json({ success: false, error: 'Funcionário não encontrado' });
    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, error: Validators.sanitizeError(error, 'Erro ao buscar funcionário') });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, cpf, rg, pis_pasep, ctps, phone, email, address, department_id, position, salary, salary_type, hire_date, shift, work_regime, work_hours_weekly, notes } = req.body;

    if (!name || !cpf || !department_id || !hire_date) {
      return res.status(400).json({ success: false, error: 'Nome, CPF, departamento e data de contratação são obrigatórios' });
    }

    // Valida CPF
    const docValidation = Validators.validateDocument(cpf);
    if (!docValidation.valid) {
      return res.status(400).json({ success: false, error: `CPF inválido: ${docValidation.error}` });
    }

    const cleanedCPF = cpf.replace(/[^\d]/g, '');

    const employee = await Employee.create({
      name, cpf: cleanedCPF, rg, pis_pasep, ctps, phone, email, address,
      department_id, position, salary, salary_type, hire_date,
      shift, work_regime, work_hours_weekly, notes, status: 'active'
    });

    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, error: 'CPF já cadastrado' });
    res.status(500).json({ success: false, error: Validators.sanitizeError(error, 'Erro ao criar funcionário') });
  }
};

exports.update = async (req, res) => {
  try {
    const allowedFields = ['name', 'rg', 'pis_pasep', 'ctps', 'phone', 'email', 'address', 'department_id', 'position', 'salary', 'salary_type', 'shift', 'work_regime', 'work_hours_weekly', 'notes'];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }

    const [updated] = await Employee.update(updateData, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ success: false, error: 'Funcionário não encontrado' });

    const employee = await Employee.findByPk(req.params.id, {
      include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'sigla'] }]
    });
    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, error: Validators.sanitizeError(error, 'Erro ao atualizar funcionário') });
  }
};

exports.remove = async (req, res) => {
  try {
    const [updated] = await Employee.update({ status: 'inactive', dismissal_date: new Date() }, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ success: false, error: 'Funcionário não encontrado' });
    res.json({ success: true, data: { message: 'Funcionário desligado com sucesso' } });
  } catch (error) {
    res.status(500).json({ success: false, error: Validators.sanitizeError(error, 'Erro ao desligar funcionário') });
  }
};

exports.getByDepartment = async (req, res) => {
  try {
    const employees = await Employee.findAll({
      where: { department_id: req.params.departmentId, status: 'active' },
      include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'sigla'] }],
      order: [['name', 'ASC']]
    });
    res.json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, error: Validators.sanitizeError(error, 'Erro ao buscar funcionários por departamento') });
  }
};

