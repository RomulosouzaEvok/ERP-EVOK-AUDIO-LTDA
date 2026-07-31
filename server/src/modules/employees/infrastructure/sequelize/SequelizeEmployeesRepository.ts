/**
 * Implementacao Sequelize do repositorio de Funcionários.
 *
 * @module modules/employees/infrastructure/sequelize/SequelizeEmployeesRepository
 */

import EmployeesRepository from '../../domain/repositories/EmployeesRepository';
const { Employee, Department }: any = require('../../../../models/index');
const { Op }: any = require('sequelize');
const Validators: any = require('../../../../utils/validators');

class SequelizeEmployeesRepository extends EmployeesRepository {
  /** @inheritdoc */
  public async findAndCountAll(
    filters: Record<string, unknown>,
    pagination: { limit: number; offset: number }
  ): Promise<{ count: number; rows: any[] }> {
    const { search, status, department_id } = filters as any;
    const where: any = {};
    if (search) {
      const s = Validators.sanitizeSearch(search);
      where[Op.or] = [{ name: { [Op.like]: `%${s}%` } }, { cpf: { [Op.like]: `%${s}%` } }];
    }
    if (status) where.status = status;
    if (department_id) where.department_id = department_id;
    return Employee.findAndCountAll({
      where,
      include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['name', 'ASC']]
    });
  }

  /** @inheritdoc */
  public async findById(id: number | string): Promise<any | null> {
    return Employee.findByPk(id, {
      include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }]
    });
  }

  /** @inheritdoc */
  public async create(data: Record<string, unknown>): Promise<any> {
    return Employee.create(data);
  }

  /** @inheritdoc */
  public async update(id: number | string, data: Record<string, unknown>): Promise<number> {
    const [updated] = await Employee.update(data, { where: { id } });
    return updated;
  }
}

export = SequelizeEmployeesRepository;
