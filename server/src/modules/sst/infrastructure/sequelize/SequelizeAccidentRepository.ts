/**
 * Implementação Sequelize do repositório do cluster Acidente/CAT (Lei 8.213/91).
 *
 * @module modules/sst/infrastructure/sequelize/SequelizeAccidentRepository
 */

import AccidentRepository from '../../domain/repositories/AccidentRepository';

const {
  SstAcidente, SstAcidenteTestemunha, SstInvestigacaoAcidente, SstAcidenteComplemento,
  SstAcaoCorretiva, SstCat
}: any = require('../../../../models/index');

class SequelizeAccidentRepository extends AccidentRepository {
  /** @inheritdoc */
  public async findAccidentsAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const { Op } = require('sequelize');
    const where: Record<string, unknown> = {};
    if (filters.employee_id) where.employee_id = filters.employee_id;
    if (filters.tipo) where.tipo = filters.tipo;
    if (filters.gravidade) where.gravidade = filters.gravidade;
    if (filters.status === 'confirmado') where.confirmado = true;
    if (filters.status === 'aberto') where.confirmado = false;
    if (filters.com_cat === 'true') where.houve_cat = true;
    if (filters.com_cat === 'false') where.houve_cat = false;
    if (filters.start_date || filters.end_date) {
      where.data_hora = {};
      if (filters.start_date) (where.data_hora as any)[Op.gte] = new Date(filters.start_date);
      if (filters.end_date) (where.data_hora as any)[Op.lte] = new Date(filters.end_date);
    }
    return SstAcidente.findAndCountAll({ where, limit: pagination.limit, offset: pagination.offset, order: [['data_hora', 'DESC']] });
  }

  /** @inheritdoc */
  public async findAccidentById(id: number | string, transaction?: any): Promise<any | null> {
    return SstAcidente.findByPk(id, {
      include: [
        { model: SstAcidenteTestemunha, as: 'testemunhas' },
        { model: SstInvestigacaoAcidente, as: 'investigacao' },
        { model: SstAcidenteComplemento, as: 'complementos' },
        { model: SstCat, as: 'cats' }
      ],
      // Com os includes opcionais acima, `FOR UPDATE` sem alvo tenta travar
      // também o lado anulável dos LEFT JOINs e o PostgreSQL rejeita a query.
      ...(transaction ? { transaction, lock: { level: transaction.LOCK.UPDATE, of: SstAcidente } } : {})
    });
  }

  /** @inheritdoc */
  public async createAccident(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return SstAcidente.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async createWitnesses(accidentId: number, employeeIds: number[], transaction?: any): Promise<void> {
    if (!employeeIds || employeeIds.length === 0) return;
    await SstAcidenteTestemunha.bulkCreate(
      employeeIds.map((employeeId) => ({ acidente_id: accidentId, employee_id: employeeId })),
      transaction ? { transaction } : undefined
    );
  }

  /** @inheritdoc */
  public async createComplement(data: Record<string, unknown>, transaction: any): Promise<any> {
    return SstAcidenteComplemento.create(data, { transaction });
  }

  /** @inheritdoc */
  public async updateAccidentConsolidated(id: number | string, data: Record<string, unknown>, transaction: any): Promise<any> {
    const acidente = await SstAcidente.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!acidente) return null;
    await acidente.update(data, { transaction });
    return acidente;
  }

  /** @inheritdoc */
  public async closeAccident(id: number | string, transaction?: any): Promise<any> {
    const acidente = await SstAcidente.findByPk(id, transaction ? { transaction, lock: transaction.LOCK.UPDATE } : undefined);
    if (!acidente) return null;
    // 'encerrado' não é uma coluna do schema atual (sst_acidentes não tem
    // status de encerramento dedicado, apenas `confirmado`) — o
    // encerramento é modelado via complemento de auditoria, ver use case.
    return acidente;
  }

  /** @inheritdoc */
  public async findInvestigationByAccidentId(accidentId: number): Promise<any | null> {
    return SstInvestigacaoAcidente.findOne({ where: { acidente_id: accidentId } });
  }

  /** @inheritdoc */
  public async createInvestigation(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return SstInvestigacaoAcidente.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async createCorrectiveAction(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return SstAcaoCorretiva.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async countCorrectiveActionsByOrigin(origemTipo: string, origemId: number): Promise<number> {
    return SstAcaoCorretiva.count({ where: { origem_tipo: origemTipo, origem_id: origemId } });
  }

  /** @inheritdoc */
  public async findCatsByAccidentId(accidentId: number): Promise<any[]> {
    return SstCat.findAll({ where: { acidente_id: accidentId }, order: [['id', 'ASC']] });
  }

  /** @inheritdoc */
  public async findCatById(id: number | string): Promise<any | null> {
    return SstCat.findByPk(id);
  }

  /** @inheritdoc */
  public async createCat(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return SstCat.create(data, transaction ? { transaction } : undefined);
  }
}

export = SequelizeAccidentRepository;
