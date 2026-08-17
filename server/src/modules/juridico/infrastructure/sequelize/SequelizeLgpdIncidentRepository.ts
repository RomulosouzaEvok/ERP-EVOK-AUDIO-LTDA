/**
 * Implementação Sequelize do repositório de `JurLgpdIncident` (RF-JUR-040,
 * LGPD art. 48).
 *
 * @module modules/juridico/infrastructure/sequelize/SequelizeLgpdIncidentRepository
 */

import LgpdIncidentRepository from '../../domain/repositories/LgpdIncidentRepository';

const { JurLgpdIncident }: any = require('../../../../models/index');

class SequelizeLgpdIncidentRepository extends LgpdIncidentRepository {
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.decisao_comunicacao) where.communication_decision = filters.decisao_comunicacao;

    return JurLgpdIncident.findAndCountAll({
      where,
      attributes: { exclude: ['description', 'affected_categories', 'action_plan'] },
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']],
    });
  }

  public async listPendingCritical(): Promise<any[]> {
    const { Op } = require('sequelize');
    const limitDate = new Date();
    limitDate.setHours(limitDate.getHours() + 72);

    return JurLgpdIncident.findAll({
      where: {
        status: { [Op.notIn]: ['closed'] },
        assessment_due_at: { [Op.lte]: limitDate },
      },
      order: [['assessment_due_at', 'ASC']],
    });
  }

  public async findById(id: number | string): Promise<any | null> {
    return JurLgpdIncident.findByPk(id);
  }

  public async create(data: Record<string, unknown>): Promise<any> {
    return JurLgpdIncident.create(data);
  }

  public async update(id: number | string, data: Record<string, unknown>): Promise<any | null> {
    const incident = await JurLgpdIncident.findByPk(id);
    if (!incident) return null;
    await incident.update(data);
    return incident;
  }
}

export = SequelizeLgpdIncidentRepository;
