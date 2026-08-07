/**
 * Implementação Sequelize do repositório do cluster CIPA (NR-5, CF/88).
 *
 * @module modules/sst/infrastructure/sequelize/SequelizeCipaRepository
 */

import CipaRepository from '../../domain/repositories/CipaRepository';

const {
  SstMandatoCipa, SstMembroCipa, SstProcessoEleitoralCipa, SstCandidatoCipa,
  SstReuniaoCipa, SstReuniaoCipaPresente, SstAcaoCorretiva, SstTreinamento, Employee
}: any = require('../../../../models/index');

class SequelizeCipaRepository extends CipaRepository {
  /** @inheritdoc */
  public async findMandatesAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    return SstMandatoCipa.findAndCountAll({ where, limit: pagination.limit, offset: pagination.offset, order: [['data_inicio', 'DESC']] });
  }

  /** @inheritdoc */
  public async findMandateById(id: number | string): Promise<any | null> {
    return SstMandatoCipa.findByPk(id, {
      include: [{ model: SstMembroCipa, as: 'membros' }]
    });
  }

  /** @inheritdoc */
  public async createMandate(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return SstMandatoCipa.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async countHeadcount(): Promise<number> {
    return Employee.count({ where: { status: 'active' } });
  }

  /** @inheritdoc */
  public async countConsecutiveElectedTerms(employeeId: number): Promise<number> {
    // Últimos 2 mandatos ordenados por data de início; conta quantos
    // mandatos consecutivos e mais recentes tiveram o funcionário eleito.
    const mandatosRecentes = await SstMandatoCipa.findAll({ order: [['data_inicio', 'DESC']], limit: 2, attributes: ['id'] });
    if (mandatosRecentes.length === 0) return 0;
    const ids = mandatosRecentes.map((m: any) => m.id);
    const membros = await SstMembroCipa.findAll({ where: { employee_id: employeeId, mandato_id: ids, origem: 'eleito' } });
    return membros.length;
  }

  /** @inheritdoc */
  public async createMember(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return SstMembroCipa.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async findMemberById(id: number | string): Promise<any | null> {
    return SstMembroCipa.findByPk(id, { include: [{ model: SstMandatoCipa, as: 'mandato' }] });
  }

  /** @inheritdoc */
  public async updateMember(id: number | string, data: Record<string, unknown>, transaction?: any): Promise<any> {
    const membro = await SstMembroCipa.findByPk(id, transaction ? { transaction, lock: transaction.LOCK.UPDATE } : undefined);
    if (!membro) return null;
    await membro.update(data, transaction ? { transaction } : undefined);
    return membro;
  }

  /** @inheritdoc */
  public async findValidCipaTraining(employeeId: number): Promise<any | null> {
    return SstTreinamento.findOne({ where: { employee_id: employeeId, norma: 'CIPA' }, order: [['data_realizacao', 'DESC']] });
  }

  /** @inheritdoc */
  public async findElectoralProcessById(id: number | string): Promise<any | null> {
    return SstProcessoEleitoralCipa.findByPk(id, { include: [{ model: SstCandidatoCipa, as: 'candidatos' }] });
  }

  /** @inheritdoc */
  public async createElectoralProcess(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return SstProcessoEleitoralCipa.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async updateElectoralProcess(id: number | string, data: Record<string, unknown>, transaction?: any): Promise<any> {
    const processo = await SstProcessoEleitoralCipa.findByPk(id, transaction ? { transaction, lock: transaction.LOCK.UPDATE } : undefined);
    if (!processo) return null;
    await processo.update(data, transaction ? { transaction } : undefined);
    return processo;
  }

  /** @inheritdoc */
  public async createCandidate(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return SstCandidatoCipa.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async findCandidatesByProcessId(processId: number): Promise<any[]> {
    return SstCandidatoCipa.findAll({ where: { processo_eleitoral_id: processId } });
  }

  /** @inheritdoc */
  public async updateCandidate(id: number | string, data: Record<string, unknown>, transaction?: any): Promise<any> {
    const candidato = await SstCandidatoCipa.findByPk(id, transaction ? { transaction, lock: transaction.LOCK.UPDATE } : undefined);
    if (!candidato) return null;
    await candidato.update(data, transaction ? { transaction } : undefined);
    return candidato;
  }

  /** @inheritdoc */
  public async findMeetingsAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const where: Record<string, unknown> = {};
    if (filters.mandate_id) where.mandato_id = filters.mandate_id;
    if (filters.tipo) where.tipo = filters.tipo;
    if (filters.mes) {
      const { Op } = require('sequelize');
      const [ano, mes] = String(filters.mes).split('-');
      const inicio = `${ano}-${mes}-01`;
      const fim = new Date(Number(ano), Number(mes), 0).toISOString().slice(0, 10);
      where.data = { [Op.gte]: inicio, [Op.lte]: fim };
    }
    return SstReuniaoCipa.findAndCountAll({ where, limit: pagination.limit, offset: pagination.offset, order: [['data', 'DESC']] });
  }

  /** @inheritdoc */
  public async createMeeting(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return SstReuniaoCipa.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async createCorrectiveAction(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return SstAcaoCorretiva.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async findActiveMembershipByEmployee(employeeId: number): Promise<any | null> {
    const { Op } = require('sequelize');
    return SstMembroCipa.findOne({
      where: { employee_id: employeeId, estabilidade_fim: { [Op.ne]: null } },
      include: [{ model: SstMandatoCipa, as: 'mandato' }],
      order: [['estabilidade_fim', 'DESC']]
    });
  }
}

export = SequelizeCipaRepository;
