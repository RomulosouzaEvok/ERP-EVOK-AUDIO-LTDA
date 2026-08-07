/**
 * Implementação Sequelize do repositório de `JurLgpdDataSubjectRequest`
 * (Solicitação de Titular — RF-JUR-037 a 039, LGPD art. 18).
 *
 * @module modules/juridico/infrastructure/sequelize/SequelizeLgpdRequestRepository
 */

import LgpdRequestRepository from '../../domain/repositories/LgpdRequestRepository';

const { JurLgpdDataSubjectRequest }: any = require('../../../../models/index');

class SequelizeLgpdRequestRepository extends LgpdRequestRepository {
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const { Op } = require('sequelize');
    const where: Record<string, unknown> = {};
    if (filters.type) where.request_type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.vencido === 'true' || filters.vencido === true) {
      where.due_date = { [Op.lt]: new Date().toISOString().slice(0, 10) };
      where.status = { [Op.notIn]: ['answered', 'rejected_justified'] };
    }

    return JurLgpdDataSubjectRequest.findAndCountAll({
      where,
      attributes: { exclude: ['requester_document', 'requester_email'] },
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['due_date', 'ASC']],
    });
  }

  public async findById(id: number | string): Promise<any | null> {
    return JurLgpdDataSubjectRequest.findByPk(id);
  }

  public async create(data: Record<string, unknown>): Promise<any> {
    return JurLgpdDataSubjectRequest.create(data);
  }

  public async update(id: number | string, data: Record<string, unknown>): Promise<any | null> {
    const request = await JurLgpdDataSubjectRequest.findByPk(id);
    if (!request) return null;
    await request.update(data);
    return request;
  }

  /**
   * `GET /api/jur/lgpd/data-subject-requests/pending-critical` — pendências
   * vencidas ou a vencer (D-5/D-1). Nunca oculta mesmo após vencer (E2/RNF-JUR-05).
   */
  public async listPendingCritical(): Promise<any[]> {
    const { Op } = require('sequelize');
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + 5);

    return JurLgpdDataSubjectRequest.findAll({
      where: {
        status: { [Op.notIn]: ['answered', 'rejected_justified'] },
        due_date: { [Op.lte]: limitDate.toISOString().slice(0, 10) },
      },
      attributes: { exclude: ['requester_document', 'requester_email'] },
      order: [['due_date', 'ASC']],
    });
  }
}

export = SequelizeLgpdRequestRepository;
