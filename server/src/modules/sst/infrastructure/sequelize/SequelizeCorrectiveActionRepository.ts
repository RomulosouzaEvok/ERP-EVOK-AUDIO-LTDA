/**
 * Implementação Sequelize do repositório de Ações Corretivas (recurso
 * único e polimórfico, `origem_tipo`/`origem_id`).
 *
 * @module modules/sst/infrastructure/sequelize/SequelizeCorrectiveActionRepository
 */

import CorrectiveActionRepository from '../../domain/repositories/CorrectiveActionRepository';

const { SstAcaoCorretiva }: any = require('../../../../models/index');

class SequelizeCorrectiveActionRepository extends CorrectiveActionRepository {
  /** @inheritdoc */
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const { Op } = require('sequelize');
    const where: Record<string, unknown> = {};
    if (filters.origem) where.origem_tipo = filters.origem;
    if (filters.status) where.status = filters.status;
    if (filters.responsavel_id) where.responsavel_id = filters.responsavel_id;
    if (filters.atrasada === 'true') {
      where.status = { [Op.notIn]: ['concluida'] };
      where.prazo = { [Op.lt]: new Date().toISOString().slice(0, 10) };
    }
    return SstAcaoCorretiva.findAndCountAll({ where, limit: pagination.limit, offset: pagination.offset, order: [['id', 'DESC']] });
  }

  /** @inheritdoc */
  public async findById(id: number | string): Promise<any | null> {
    return SstAcaoCorretiva.findByPk(id);
  }

  /** @inheritdoc */
  public async create(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return SstAcaoCorretiva.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async update(id: number | string, data: Record<string, unknown>, transaction?: any): Promise<any> {
    const acao = await SstAcaoCorretiva.findByPk(id, transaction ? { transaction, lock: transaction.LOCK.UPDATE } : undefined);
    if (!acao) return null;
    await acao.update(data, transaction ? { transaction } : undefined);
    return acao;
  }
}

export = SequelizeCorrectiveActionRepository;
