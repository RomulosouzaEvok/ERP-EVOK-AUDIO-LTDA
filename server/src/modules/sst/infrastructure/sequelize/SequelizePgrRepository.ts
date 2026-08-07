/**
 * Implementação Sequelize do repositório do cluster PGR/GRO + GES (NR-1).
 *
 * @module modules/sst/infrastructure/sequelize/SequelizePgrRepository
 */

import PgrRepository from '../../domain/repositories/PgrRepository';

const { SstRiscoOcupacional, SstGes, SstGesFuncionario }: any = require('../../../../models/index');

class SequelizePgrRepository extends PgrRepository {
  /** @inheritdoc */
  public async findRisksAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const { Op } = require('sequelize');
    const where: Record<string, unknown> = {};
    if (filters.department_id) where.department_id = filters.department_id;
    if (filters.categoria_agente) where.categoria_agente = filters.categoria_agente;
    if (filters.revisao_vencida === 'true') where.proxima_revisao_prevista = { [Op.lt]: new Date().toISOString().slice(0, 10) };
    return SstRiscoOcupacional.findAndCountAll({ where, limit: pagination.limit, offset: pagination.offset, order: [['id', 'DESC']] });
  }

  /** @inheritdoc */
  public async findRiskById(id: number | string): Promise<any | null> {
    return SstRiscoOcupacional.findByPk(id);
  }

  /** @inheritdoc */
  public async createRisk(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return SstRiscoOcupacional.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async updateRisk(id: number | string, data: Record<string, unknown>, transaction?: any): Promise<any> {
    const risco = await SstRiscoOcupacional.findByPk(id, transaction ? { transaction, lock: transaction.LOCK.UPDATE } : undefined);
    if (!risco) return null;
    await risco.update(data, transaction ? { transaction } : undefined);
    return risco;
  }

  /** @inheritdoc */
  public async findGesAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    return SstGes.findAndCountAll({ limit: pagination.limit, offset: pagination.offset, order: [['id', 'DESC']] });
  }

  /** @inheritdoc */
  public async findGesById(id: number | string): Promise<any | null> {
    return SstGes.findByPk(id);
  }

  /** @inheritdoc */
  public async createGes(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return SstGes.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async createGesMember(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return SstGesFuncionario.create(data, transaction ? { transaction } : undefined);
  }
}

export = SequelizePgrRepository;
