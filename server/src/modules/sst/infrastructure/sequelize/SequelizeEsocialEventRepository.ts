/**
 * Implementação Sequelize do repositório da fila de eventos eSocial SST.
 *
 * @module modules/sst/infrastructure/sequelize/SequelizeEsocialEventRepository
 */

import EsocialEventRepository from '../../domain/repositories/EsocialEventRepository';

const { SstEventoEsocial }: any = require('../../../../models/index');

class SequelizeEsocialEventRepository extends EsocialEventRepository {
  /** @inheritdoc */
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const where: Record<string, unknown> = {};
    if (filters.tipo) where.tipo = filters.tipo;
    if (filters.status) where.status = filters.status;
    return SstEventoEsocial.findAndCountAll({ where, limit: pagination.limit, offset: pagination.offset, order: [['id', 'DESC']] });
  }

  /** @inheritdoc */
  public async findById(id: number | string): Promise<any | null> {
    return SstEventoEsocial.findByPk(id);
  }

  /** @inheritdoc */
  public async findActiveByOrigin(origemTipo: string, origemId: number, transaction?: any): Promise<any | null> {
    return SstEventoEsocial.findOne({
      where: { origem_tipo: origemTipo, origem_id: origemId, status: { [require('sequelize').Op.ne]: 'rejeitado' } },
      ...(transaction ? { transaction } : {})
    });
  }

  /** @inheritdoc */
  public async create(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return SstEventoEsocial.create(data, transaction ? { transaction } : undefined);
  }
}

export = SequelizeEsocialEventRepository;
