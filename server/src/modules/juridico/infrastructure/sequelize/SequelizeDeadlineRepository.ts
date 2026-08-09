/**
 * Implementação Sequelize do repositório de `JurLegalCaseDeadline`.
 *
 * @module modules/juridico/infrastructure/sequelize/SequelizeDeadlineRepository
 */

import DeadlineRepository from '../../domain/repositories/DeadlineRepository';

const { JurLegalCaseDeadline, JurLegalCase }: any = require('../../../../models/index');

class SequelizeDeadlineRepository extends DeadlineRepository {
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const { Op } = require('sequelize');
    const where: Record<string, unknown> = {};
    if (filters.responsible_user_id) where.responsible_user_id = filters.responsible_user_id;
    if (filters.status) where.status = filters.status;
    if (filters.is_fatal !== undefined) where.is_fatal = filters.is_fatal === 'true' || filters.is_fatal === true;
    if (filters.legal_case_id) where.legal_case_id = filters.legal_case_id;
    if (filters.vencendo_em_dias !== undefined) {
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() + Number(filters.vencendo_em_dias));
      where.due_date = { [Op.lte]: limitDate.toISOString().slice(0, 10) };
    }

    return JurLegalCaseDeadline.findAndCountAll({
      where,
      attributes: { exclude: ['evidence_file_path'] },
      include: [{ model: JurLegalCase, as: 'legalCase', attributes: ['id', 'case_number'], required: false }],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['due_date', 'ASC']],
    });
  }

  public async findById(id: number | string): Promise<any | null> {
    return JurLegalCaseDeadline.findByPk(id, {
      include: [{ model: JurLegalCase, as: 'legalCase', attributes: ['id', 'case_number'], required: false }],
    });
  }

  public async create(data: Record<string, unknown>): Promise<any> {
    return JurLegalCaseDeadline.create(data);
  }

  public async update(id: number | string, data: Record<string, unknown>): Promise<any | null> {
    const deadline = await JurLegalCaseDeadline.findByPk(id);
    if (!deadline) return null;
    await deadline.update(data);
    return deadline;
  }

  /**
   * Prazos críticos: perdidos (`missed`) + pendentes vencendo em ≤3 dias.
   *
   * NOTA: consultava também `status='escalated'`, valor que **não existe**
   * no enum (`pending`/`fulfilled_pending_confirmation`/`confirmed`/
   * `missed`/`confirmed_late`) — o Postgres rejeitava a query inteira com
   * `invalid input value for enum`, devolvendo 500 e quebrando o widget
   * "Pendências de Jurídico" da home. Escalada é rastreada pela coluna
   * `escalated_at`, não por status; como o job de escalada automática em
   * D-3 (BR-JUR-011) ainda não existe, nada popula essa coluna e não há o
   * que filtrar por ela — quando o job for implementado, incluir aqui a
   * condição `escalated_at IS NOT NULL`.
   */
  public async listCritical(): Promise<any[]> {
    const { Op } = require('sequelize');
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + 3);

    return JurLegalCaseDeadline.findAll({
      where: {
        [Op.or]: [
          { status: 'missed' },
          { status: 'pending', due_date: { [Op.lte]: limitDate.toISOString().slice(0, 10) } },
        ],
      },
      attributes: { exclude: ['evidence_file_path'] },
      include: [{ model: JurLegalCase, as: 'legalCase', attributes: ['id', 'case_number'], required: false }],
      order: [['due_date', 'ASC']],
    });
  }
}

export = SequelizeDeadlineRepository;
