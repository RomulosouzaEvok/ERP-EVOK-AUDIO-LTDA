/**
 * Implementacao Sequelize do repositorio de Ordens de Serviço.
 *
 * @module modules/serviceOrders/infrastructure/sequelize/SequelizeServiceOrdersRepository
 */

import ServiceOrdersRepository from '../../domain/repositories/ServiceOrdersRepository';
const { ServiceOrder, Client, Product, User }: any = require('../../../../models/index');

class SequelizeServiceOrdersRepository extends ServiceOrdersRepository {
  /** @inheritdoc */
  public async findAndCountAll(
    filters: Record<string, unknown>,
    pagination: { limit: number; offset: number }
  ): Promise<{ count: number; rows: any[] }> {
    const { status, client_id } = filters as any;
    const where: any = {};
    if (status) where.status = status;
    if (client_id) where.client_id = client_id;
    return ServiceOrder.findAndCountAll({
      where,
      include: [
        { model: Client, as: 'client', attributes: ['id', 'name'] },
        { model: Product, as: 'product', attributes: ['id', 'name', 'code'] }
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']]
    });
  }

  /** @inheritdoc */
  public async findById(id: number | string): Promise<any | null> {
    return ServiceOrder.findByPk(id, {
      include: [
        { model: Client, as: 'client' },
        { model: Product, as: 'product' },
        { model: User, as: 'technician', attributes: ['id', 'name'] }
      ]
    });
  }

  /** @inheritdoc */
  public async create(data: Record<string, unknown>): Promise<any> {
    return ServiceOrder.create(data);
  }

  /** @inheritdoc */
  public async update(id: number | string, data: Record<string, unknown>): Promise<number> {
    const [updated] = await ServiceOrder.update(data, { where: { id } });
    return updated;
  }
}

export = SequelizeServiceOrdersRepository;
