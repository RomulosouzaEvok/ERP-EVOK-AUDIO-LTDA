/**
 * Implementacao Sequelize do repositorio de Clientes.
 *
 * @module modules/clients/infrastructure/sequelize/SequelizeClientsRepository
 */

import { Op } from 'sequelize';
import ClientsRepository, { ClientsListOptions } from '../../domain/repositories/ClientsRepository';
const { Client, Sale }: any = require('../../../../models/index');
const Validators = require('../../../../utils/validators');

class SequelizeClientsRepository extends ClientsRepository {
  /** @inheritdoc */
  public async list({ limit, offset, search, status }: ClientsListOptions): Promise<{ rows: any[]; count: number }> {
    const where: any = {};
    if (search) {
      const sanitized = Validators.sanitizeSearch(search);
      where[Op.or] = [
        { name: { [Op.like]: `%${sanitized}%` } },
        { cpf_cnpj: { [Op.like]: `%${sanitized}%` } },
        { email: { [Op.like]: `%${sanitized}%` } }
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
