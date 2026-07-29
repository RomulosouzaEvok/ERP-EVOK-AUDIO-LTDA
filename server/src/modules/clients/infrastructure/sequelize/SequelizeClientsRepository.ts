/**
 * Implementacao Sequelize do repositorio de Clientes.
 *
 * @module modules/clients/infrastructure/sequelize/SequelizeClientsRepository
 */

import { Op } from 'sequelize';
import ClientsRepository, { ClientsListOptions } from '../../domain/repositories/ClientsRepository';
const { Client, Sale }: any = require('../../../../models/index');

class SequelizeClientsRepository extends ClientsRepository {
  /** @inheritdoc */
  public async list({ limit, offset, search, status }: ClientsListOptions): Promise<{ rows: any[]; count: number }> {
    const where: any = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { cpf_cnpj: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) where.status = status;

    return Client.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
  }

  /** @inheritdoc */
  public async findById(id: number): Promise<any | null> {
    return Client.findByPk(id);
  }

  /** @inheritdoc */
  public async create(data: Record<string, unknown>): Promise<any> {
    return Client.create(data);
  }

  /** @inheritdoc */
  public async update(id: number, data: Record<string, unknown>): Promise<number> {
    const [updated] = await Client.update(data, { where: { id } });
    return updated;
  }

  /** @inheritdoc */
  public async countActiveSales(clientId: number): Promise<number> {
    return Sale.count({
      where: {
        customer_id: clientId,
        status: { [Op.in]: ['quote', 'confirmed', 'invoiced'] }
      }
    });
  }
}

export = SequelizeClientsRepository;
