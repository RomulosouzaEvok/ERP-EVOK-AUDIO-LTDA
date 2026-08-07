/**
 * Implementação Sequelize do repositório de `JurLegalCase`/
 * `JurLegalCaseEvent`/`JurLegalCaseProvision`.
 *
 * @module modules/juridico/infrastructure/sequelize/SequelizeLegalCaseRepository
 */

import LegalCaseRepository from '../../domain/repositories/LegalCaseRepository';

const {
  JurLegalCase,
  JurLegalCaseEvent,
  JurLegalCaseProvision,
  JurExternalLawyer,
}: any = require('../../../../models/index');

class SequelizeLegalCaseRepository extends LegalCaseRepository {
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const where: Record<string, unknown> = {};
    if (filters.type) where.case_type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.internal_responsible_user_id) where.internal_responsible_user_id = filters.internal_responsible_user_id;

    return JurLegalCase.findAndCountAll({
      where,
      attributes: { exclude: ['opposing_party_name', 'opposing_party_employee_id', 'opposing_party_supplier_id', 'opposing_party_client_id'] },
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']],
    });
  }

  public async findById(id: number | string): Promise<any | null> {
    return JurLegalCase.findByPk(id, {
      include: [
        { model: JurExternalLawyer, as: 'externalLawyer', required: false },
        { model: JurLegalCaseEvent, as: 'events' },
        { model: JurLegalCaseProvision, as: 'provisions' },
      ],
    });
  }

  public async findByCaseNumber(caseNumber: string): Promise<any | null> {
    return JurLegalCase.findOne({ where: { case_number: caseNumber } });
  }

  public async create(data: Record<string, unknown>): Promise<any> {
    return JurLegalCase.create(data);
  }

  public async update(id: number | string, data: Record<string, unknown>): Promise<any | null> {
    const legalCase = await JurLegalCase.findByPk(id);
    if (!legalCase) return null;
    await legalCase.update(data);
    return legalCase;
  }

  public async listActiveWithoutCurrentProvision(): Promise<any[]> {
    return JurLegalCase.findAll({
      where: { status: 'active' },
      include: [{ model: JurLegalCaseProvision, as: 'provisions', required: false }],
    });
  }

  // ---- andamentos ----
  public async addEvent(data: Record<string, unknown>): Promise<any> {
    return JurLegalCaseEvent.create(data);
  }
  public async listEvents(legalCaseId: number | string): Promise<any[]> {
    return JurLegalCaseEvent.findAll({ where: { legal_case_id: legalCaseId }, order: [['occurred_at', 'DESC']] });
  }

  // ---- provisões ----
  public async addProvision(data: Record<string, unknown>): Promise<any> {
    return JurLegalCaseProvision.create(data);
  }
  public async listProvisions(legalCaseId: number | string): Promise<any[]> {
    return JurLegalCaseProvision.findAll({ where: { legal_case_id: legalCaseId }, order: [['assessed_at', 'DESC']] });
  }
  public async getCurrentProvision(legalCaseId: number | string): Promise<any | null> {
    return JurLegalCaseProvision.findOne({ where: { legal_case_id: legalCaseId }, order: [['assessed_at', 'DESC']] });
  }
  public async listAllCurrentProvisions(): Promise<any[]> {
    const { sequelize } = require('../../../../config/database');
    const { QueryTypes } = require('sequelize');
    return sequelize.query(
      `SELECT DISTINCT ON (p.legal_case_id) p.*, lc.case_number, lc.case_type, lc.status AS case_status
       FROM jur_legal_case_provisions p
       JOIN jur_legal_cases lc ON lc.id = p.legal_case_id
       ORDER BY p.legal_case_id, p.assessed_at DESC`,
      { type: QueryTypes.SELECT },
    );
  }
}

export = SequelizeLegalCaseRepository;
