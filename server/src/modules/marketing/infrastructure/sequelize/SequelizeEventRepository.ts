/**
 * Implementação Sequelize/PostgreSQL do {@link EventRepository}.
 *
 * @module modules/marketing/infrastructure/sequelize/SequelizeEventRepository
 */

import { Op } from 'sequelize';

const EventRepository = require('../../domain/repositories/EventRepository');
const {
  MarketingEvent, MarketingEventChecklistItem, MarketingCampaign,
} = require('../../../../models/index');

class SequelizeEventRepository extends EventRepository {
  async listEvents(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.event_type) where.event_type = filters.event_type;
    if (filters.campaign_id) where.campaign_id = filters.campaign_id;
    if (filters.date_from || filters.date_to) {
      where.start_date = {};
      if (filters.date_from) where.start_date[Op.gte] = filters.date_from;
      if (filters.date_to) where.start_date[Op.lte] = filters.date_to;
    }

    const { count, rows } = await MarketingEvent.findAndCountAll({
      where,
      include: [{ model: MarketingCampaign, as: 'campaign', attributes: ['id', 'name'] }],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['start_date', 'DESC']],
    });

    return { rows, count };
  }

  async findEventById(id: number) {
    return MarketingEvent.findByPk(id, {
      include: [
        { model: MarketingCampaign, as: 'campaign', attributes: ['id', 'name'] },
        { model: MarketingEventChecklistItem, as: 'checklist' },
      ],
    });
  }

  async createEvent(data: Record<string, unknown>) {
    const created = await MarketingEvent.create(data);
    return this.findEventById(created.id);
  }

  async updateEvent(id: number, data: Record<string, unknown>) {
    const event = await MarketingEvent.findByPk(id);
    if (!event) return null;
    await event.update(data);
    return this.findEventById(id);
  }

  async addChecklistItem(eventId: number, data: Record<string, unknown>) {
    return MarketingEventChecklistItem.create({ ...data, event_id: eventId });
  }

  async findChecklistItemById(eventId: number, itemId: number) {
    return MarketingEventChecklistItem.findOne({ where: { id: itemId, event_id: eventId } });
  }

  async updateChecklistItem(eventId: number, itemId: number, data: Record<string, unknown>) {
    const item = await MarketingEventChecklistItem.findOne({ where: { id: itemId, event_id: eventId } });
    if (!item) return null;
    await item.update(data);
    return item;
  }
}

export = SequelizeEventRepository;
