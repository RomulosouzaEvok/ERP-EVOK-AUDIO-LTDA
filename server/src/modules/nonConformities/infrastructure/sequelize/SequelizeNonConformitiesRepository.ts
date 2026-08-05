/**
 * Implementacao Sequelize do repositorio de Não Conformidades.
 *
 * @module modules/nonConformities/infrastructure/sequelize/SequelizeNonConformitiesRepository
 */

import NonConformitiesRepository from '../../domain/repositories/NonConformitiesRepository';
const { NonConformity, Product, ProductionOrder, Supplier, User }: any = require('../../../../models/index');

class SequelizeNonConformitiesRepository extends NonConformitiesRepository {
  /** @inheritdoc */
  public async findAndCountAll(
    filters: Record<string, unknown>,
    pagination: { limit: number; offset: number }
  ): Promise<{ count: number; rows: any[] }> {
    const { status, severity } = filters as any;
    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;
    return NonConformity.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'reporter', attributes: ['id', 'name'] }
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']]
    });
  }

  /** @inheritdoc */
  public async findById(id: number | string): Promise<any | null> {
    return NonConformity.findByPk(id, {
      include: [
        { model: Product, as: 'product' },
        { model: ProductionOrder, as: 'productionOrder' },
        { model: Supplier, as: 'supplier' },
        { model: User, as: 'reporter' }
      ]
    });
  }

  /** @inheritdoc */
  public async create(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return NonConformity.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async update(id: number | string, data: Record<string, unknown>, transaction?: any): Promise<number> {
    const [updated] = await NonConformity.update(data, { where: { id }, ...(transaction ? { transaction } : {}) });
    return updated;
  }
}

export = SequelizeNonConformitiesRepository;
