/**
 * Implementacao Sequelize do repositorio de Categorias.
 *
 * @module modules/categories/infrastructure/sequelize/SequelizeCategoriesRepository
 */

import CategoriesRepository from '../../domain/repositories/CategoriesRepository';
const { Category }: any = require('../../../../models/index');

class SequelizeCategoriesRepository extends CategoriesRepository {
  /** @inheritdoc */
  public async listActive(): Promise<any[]> {
    return Category.findAll({ where: { active: true }, order: [['name', 'ASC']] });
  }

  /** @inheritdoc */
  public async findById(id: number): Promise<any | null> {
    return Category.findByPk(id);
  }

  /** @inheritdoc */
  public async create(data: Record<string, unknown>): Promise<any> {
    return Category.create(data);
  }

  /** @inheritdoc */
  public async update(id: number, data: Record<string, unknown>): Promise<number> {
    const [updated] = await Category.update(data, { where: { id } });
    return updated;
  }
}

export = SequelizeCategoriesRepository;
