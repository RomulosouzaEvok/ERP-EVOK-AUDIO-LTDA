/**
 * Implementação Sequelize do repositório do cluster Treinamentos de
 * Segurança (NRs).
 *
 * @module modules/sst/infrastructure/sequelize/SequelizeTrainingRepository
 */

import TrainingRepository from '../../domain/repositories/TrainingRepository';

const { SstMatrizTreinamento, SstTreinamento, Employee }: any = require('../../../../models/index');

class SequelizeTrainingRepository extends TrainingRepository {
  /** @inheritdoc */
  public async findMatrixAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const where: Record<string, unknown> = {};
    if (filters.position) where.position = filters.position;
    if (filters.norma) where.norma = filters.norma;
    return SstMatrizTreinamento.findAndCountAll({ where, limit: pagination.limit, offset: pagination.offset, order: [['id', 'DESC']] });
  }

  /** @inheritdoc */
  public async findMatrixById(id: number | string): Promise<any | null> {
    return SstMatrizTreinamento.findByPk(id);
  }

  /** @inheritdoc */
  public async createMatrixItem(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return SstMatrizTreinamento.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async updateMatrixItem(id: number | string, data: Record<string, unknown>, transaction?: any): Promise<any> {
    const item = await SstMatrizTreinamento.findByPk(id, transaction ? { transaction, lock: transaction.LOCK.UPDATE } : undefined);
    if (!item) return null;
    await item.update(data, transaction ? { transaction } : undefined);
    return item;
  }

  /** @inheritdoc */
  public async findMatrixByPositionAndNorma(position: string, norma: string): Promise<any | null> {
    return SstMatrizTreinamento.findOne({ where: { position, norma } });
  }

  /** @inheritdoc */
  public async findTrainingsAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const { Op } = require('sequelize');
    const where: Record<string, unknown> = {};
    if (filters.employee_id) where.employee_id = filters.employee_id;
    if (filters.norma) where.norma = filters.norma;
    if (filters.vencido === 'true') where.validade = { [Op.lt]: new Date().toISOString().slice(0, 10) };
    return SstTreinamento.findAndCountAll({ where, limit: pagination.limit, offset: pagination.offset, order: [['id', 'DESC']] });
  }

  /** @inheritdoc */
  public async createTraining(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return SstTreinamento.create(data, transaction ? { transaction } : undefined);
  }

  /**
   * @inheritdoc
   * Junta `sst_matriz_treinamento` (obrigatoriedade por função) ×
   * `sst_treinamentos` (último realizado por funcionário/norma) ×
   * `employees` (função atual), retornando quem está vencido/sem registro.
   */
  public async findBlocklist(): Promise<any[]> {
    const { Op } = require('sequelize');
    const matriz = await SstMatrizTreinamento.findAll({ where: { ativo: true } });
    const hoje = new Date().toISOString().slice(0, 10);
    const resultado: any[] = [];

    for (const item of matriz) {
      const funcionarios = await Employee.findAll({ where: { position: item.position, status: 'active' } });
      for (const funcionario of funcionarios) {
        const treinamento = await SstTreinamento.findOne({
          where: { employee_id: funcionario.id, norma: item.norma },
          order: [['data_realizacao', 'DESC']]
        });
        const vencido = !treinamento || (treinamento.validade && treinamento.validade < hoje);
        if (vencido) {
          resultado.push({
            employee_id: funcionario.id,
            position: funcionario.position,
            norma: item.norma,
            validade_vencida_em: treinamento?.validade ?? null
          });
        }
      }
    }
    return resultado;
  }
}

export = SequelizeTrainingRepository;
