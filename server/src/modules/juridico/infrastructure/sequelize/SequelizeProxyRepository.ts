/**
 * Implementação Sequelize do repositório de `JurProxy` (Procuração — UC-55).
 *
 * @module modules/juridico/infrastructure/sequelize/SequelizeProxyRepository
 */

import ProxyRepository from '../../domain/repositories/ProxyRepository';

const { JurProxy }: any = require('../../../../models/index');

class SequelizeProxyRepository extends ProxyRepository {
  /**
   * Lista procurações. Default (`status` não informado) exclui
   * `revoked`/`expired` das telas de "vigentes" (E1/E2 do UC-55).
   */
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const { Op } = require('sequelize');
    const where: Record<string, unknown> = {};
    if (filters.status) {
      where.status = filters.status;
    } else {
      where.status = { [Op.notIn]: ['revoked', 'expired'] };
    }
    if (filters.employee_id) where.employee_id = filters.employee_id;
    if (filters.external_lawyer_id) where.external_lawyer_id = filters.external_lawyer_id;
    if (filters.vencendo_em_dias !== undefined) {
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() + Number(filters.vencendo_em_dias));
      where.expiration_date = { [Op.lte]: limitDate.toISOString().slice(0, 10), [Op.gte]: new Date().toISOString().slice(0, 10) };
    }

    return JurProxy.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']],
    });
  }

  public async findById(id: number | string): Promise<any | null> {
    return JurProxy.findByPk(id);
  }

  public async create(data: Record<string, unknown>): Promise<any> {
    return JurProxy.create(data);
  }

  public async update(id: number | string, data: Record<string, unknown>): Promise<any | null> {
    const proxy = await JurProxy.findByPk(id);
    if (!proxy) return null;
    await proxy.update(data);
    return proxy;
  }
}

export = SequelizeProxyRepository;
