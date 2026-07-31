/**
 * Implementacao Sequelize do repositorio de Ativos (patrimônio).
 *
 * @module modules/assets/infrastructure/sequelize/SequelizeAssetsRepository
 */

import AssetsRepository from '../../domain/repositories/AssetsRepository';
const { Asset, Department, Employee }: any = require('../../../../models/index');

class SequelizeAssetsRepository extends AssetsRepository {
  /** @inheritdoc */
  public async findAndCountAll(
    filters: Record<string, unknown>,
    pagination: { limit: number; offset: number }
  ): Promise<{ count: number; rows: any[] }> {
    const { status, department_id } = filters as any;
    const where: any = {};
    if (status) where.status = status;
    if (department_id) where.department_id = department_id;
    return Asset.findAndCountAll({
      where,
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: Employee, as: 'responsible', attributes: ['id', 'name'] }
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['name', 'ASC']]
    });
  }

  /** @inheritdoc */
  public async findById(id: number | string): Promise<any | null> {
    return Asset.findByPk(id, {
      include: [
        { model: Department, as: 'department' },
        { model: Employee, as: 'responsible' }
      ]
    });
  }

  /** @inheritdoc */
  public async create(data: Record<string, unknown>): Promise<any> {
    return Asset.create(data);
  }

  /** @inheritdoc */
  public async update(id: number | string, data: Record<string, unknown>): Promise<number> {
    const [updated] = await Asset.update(data, { where: { id } });
    return updated;
  }
}

export = SequelizeAssetsRepository;
