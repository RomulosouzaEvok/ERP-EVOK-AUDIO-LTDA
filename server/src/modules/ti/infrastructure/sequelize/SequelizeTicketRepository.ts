/**
 * Implementação Sequelize do repositório de ItTicket/ItTicketCategory/
 * ItTicketComment/ItTicketPriorityHistory.
 *
 * @module modules/ti/infrastructure/sequelize/SequelizeTicketRepository
 */

import TicketRepository from '../../domain/repositories/TicketRepository';

const { ItTicket, ItTicketCategory, ItTicketComment, ItTicketPriorityHistory, User, Employee, Asset }: any = require('../../../../models/index');

class SequelizeTicketRepository extends TicketRepository {
  // ---- categorias ----
  public async findAndCountCategories(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const where: Record<string, unknown> = {};
    if (filters.active !== undefined) where.active = filters.active === 'true' || filters.active === true;
    return ItTicketCategory.findAndCountAll({ where, limit: pagination.limit, offset: pagination.offset, order: [['name', 'ASC']] });
  }

  public async listActiveCategories(): Promise<any[]> {
    return ItTicketCategory.findAll({ where: { active: true }, attributes: ['id', 'name', 'default_priority'], order: [['name', 'ASC']] });
  }

  public async findCategoryById(id: number | string): Promise<any | null> {
    return ItTicketCategory.findByPk(id);
  }

  public async findCategoryByName(name: string): Promise<any | null> {
    return ItTicketCategory.findOne({ where: { name } });
  }

  public async createCategory(data: Record<string, unknown>): Promise<any> {
    return ItTicketCategory.create(data);
  }

  public async updateCategory(id: number | string, data: Record<string, unknown>): Promise<any | null> {
    const category = await ItTicketCategory.findByPk(id);
    if (!category) return null;
    await category.update(data);
    return category;
  }

  // ---- tickets ----
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const { Op } = require('sequelize');
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.category_id) where.category_id = filters.category_id;
    if (filters.assigned_to) where.assigned_to = filters.assigned_to;
    if (filters.asset_id) where.asset_id = filters.asset_id;
    if (filters.requester_id) where.requester_id = filters.requester_id;
    if (filters.sla_overdue === 'true') {
      where.sla_resolution_due_at = { [Op.lt]: new Date() };
      where.status = { [Op.notIn]: ['resolved', 'closed', 'canceled'] };
    }
    if (filters.start_date || filters.end_date) {
      where.createdAt = {};
      if (filters.start_date) (where.createdAt as any)[Op.gte] = filters.start_date;
      if (filters.end_date) (where.createdAt as any)[Op.lte] = filters.end_date;
    }

    return ItTicket.findAndCountAll({
      where,
      include: [
        { model: ItTicketCategory, as: 'category', attributes: ['id', 'name'] },
        { model: User, as: 'requester', attributes: ['id', 'name', 'email'], required: false },
        { model: User, as: 'assignedToUser', attributes: ['id', 'name', 'email'], required: false },
        { model: Asset, as: 'asset', attributes: ['id', 'tag', 'name'], required: false },
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']],
    });
  }

  public async findById(id: number | string): Promise<any | null> {
    return ItTicket.findByPk(id, {
      include: [
        { model: ItTicketCategory, as: 'category', attributes: ['id', 'name'] },
        { model: User, as: 'requester', attributes: ['id', 'name', 'email'], required: false },
        { model: User, as: 'assignedToUser', attributes: ['id', 'name', 'email'], required: false },
        { model: Asset, as: 'asset', attributes: ['id', 'tag', 'name'], required: false },
        { model: Employee, as: 'onBehalfOfEmployee', attributes: ['id', 'name'], required: false },
      ],
    });
  }

  public async countByYear(year: number): Promise<number> {
    const { Op } = require('sequelize');
    return ItTicket.count({
      where: { createdAt: { [Op.gte]: new Date(`${year}-01-01T00:00:00Z`), [Op.lt]: new Date(`${year + 1}-01-01T00:00:00Z`) } },
    });
  }

  public async create(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return ItTicket.create(data, transaction ? { transaction } : undefined);
  }

  public async update(id: number | string, data: Record<string, unknown>, transaction?: any): Promise<any | null> {
    const ticket = await ItTicket.findByPk(id, transaction ? { transaction } : undefined);
    if (!ticket) return null;
    await ticket.update(data, transaction ? { transaction } : undefined);
    return ticket;
  }

  // ---- comentários ----
  public async listComments(ticketId: number | string): Promise<any[]> {
    return ItTicketComment.findAll({
      where: { ticket_id: ticketId },
      include: [{ model: User, as: 'author', attributes: ['id', 'name'] }],
      order: [['created_at', 'ASC']],
    });
  }

  public async createComment(data: Record<string, unknown>): Promise<any> {
    return ItTicketComment.create(data);
  }

  // ---- histórico de prioridade ----
  public async createPriorityHistory(data: Record<string, unknown>): Promise<any> {
    return ItTicketPriorityHistory.create(data);
  }
}

export = SequelizeTicketRepository;
