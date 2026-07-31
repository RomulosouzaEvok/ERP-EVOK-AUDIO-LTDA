/**
 * Implementacao Sequelize do repositorio de Departamentos.
 *
 * @module modules/departments/infrastructure/sequelize/SequelizeDepartmentsRepository
 */

import DepartmentsRepository from '../../domain/repositories/DepartmentsRepository';
const { Department }: any = require('../../../../models/index');

class SequelizeDepartmentsRepository extends DepartmentsRepository {
  /** @inheritdoc */
  public async listActive(): Promise<any[]> {
    return Department.findAll({ where: { active: true }, order: [['name', 'ASC']] });
  }

  /** @inheritdoc */
  public async findById(id: number | string): Promise<any | null> {
    return Department.findByPk(id);
  }

  /** @inheritdoc */
  public async create(data: Record<string, unknown>): Promise<any> {
    return Department.create(data);
  }

  /** @inheritdoc */
  public async update(id: number | string, data: Record<string, unknown>): Promise<number> {
    const [updated] = await Department.update(data, { where: { id } });
    return updated;
  }
}

export = SequelizeDepartmentsRepository;
