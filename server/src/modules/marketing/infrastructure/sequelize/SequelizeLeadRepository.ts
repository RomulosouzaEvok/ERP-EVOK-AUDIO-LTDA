/**
 * Implementação Sequelize/PostgreSQL do {@link LeadRepository}.
 *
 * @module modules/marketing/infrastructure/sequelize/SequelizeLeadRepository
 */

import { Op } from 'sequelize';
import { HANDOFF_SLA_DAYS } from '../../domain/constants';

const LeadRepository = require('../../domain/repositories/LeadRepository');
const { MarketingLead, MarketingCampaign, MarketingEvent, Client } = require('../../../../models/index');

class SequelizeLeadRepository extends LeadRepository {
  async listLeads(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.campaign_id) where.campaign_id = filters.campaign_id;
    if (filters.lead_source) where.lead_source = filters.lead_source;
    if (filters.event_id) where.event_id = filters.event_id;
    if (filters.sales_owner_user_id) where.sales_owner_user_id = filters.sales_owner_user_id;
    if (typeof filters.data_issue_flag === 'boolean') where.needs_review = filters.data_issue_flag;

    if (filters.sla_breached === true) {
      const slaDeadline = new Date();
      slaDeadline.setDate(slaDeadline.getDate() - HANDOFF_SLA_DAYS);
      where.status = 'qualified';
      where.sales_owner_user_id = null;
      where.qualified_at = { [Op.ne]: null, [Op.lte]: slaDeadline };
    }

    const { count, rows } = await MarketingLead.findAndCountAll({
      where,
      include: [
        { model: MarketingCampaign, as: 'campaign', attributes: ['id', 'name'] },
        { model: MarketingEvent, as: 'event', attributes: ['id', 'name'] },
        { model: Client, as: 'convertedCustomer', attributes: ['id', 'name'] },
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['created_at', 'DESC']],
    });

    return { rows, count };
  }

  async findLeadById(id: number) {
    return MarketingLead.findByPk(id, {
      include: [
        { model: MarketingCampaign, as: 'campaign', attributes: ['id', 'name'] },
        { model: MarketingEvent, as: 'event', attributes: ['id', 'name'] },
        { model: Client, as: 'convertedCustomer', attributes: ['id', 'name'] },
      ],
    });
  }

  async createLead(data: Record<string, unknown>) {
    const created = await MarketingLead.create(data);
    return this.findLeadById(created.id);
  }

  async updateLead(id: number, data: Record<string, unknown>, transaction?: unknown) {
    const options = transaction ? { transaction } : undefined;
    const lead = await MarketingLead.findByPk(id, options);
    if (!lead) return null;
    await lead.update(data, options);
    // Dentro de uma transação aberta, uma releitura sem `transaction` não
    // enxergaria o dado ainda não commitado (READ COMMITTED) — retorna a
    // própria instância atualizada em vez de reconsultar.
    return transaction ? lead : this.findLeadById(id);
  }

  async findOpenLeadByContact(email: string | null, phone: string | null) {
    const contactConditions: any[] = [];
    if (email) contactConditions.push({ email: email.trim().toLowerCase() });
    if (phone) contactConditions.push({ phone: phone.replace(/\D/g, '') });
    if (!contactConditions.length) return null;

    return MarketingLead.findOne({
      where: {
        status: { [Op.notIn]: ['converted', 'lost'] },
        [Op.or]: contactConditions,
      },
    });
  }

  async countByCampaignId(campaignId: number) {
    return MarketingLead.count({ where: { campaign_id: campaignId } });
  }

  async findConvertedByCampaignId(campaignId: number) {
    const rows = await MarketingLead.findAll({
      where: { campaign_id: campaignId, status: 'converted', converted_to_customer_id: { [Op.ne]: null } },
      attributes: ['converted_to_customer_id', 'converted_at'],
      raw: true,
    });
    return rows as Array<{ converted_to_customer_id: number; converted_at: Date | null }>;
  }

  async findByEventId(eventId: number) {
    return MarketingLead.findAll({
      where: { event_id: eventId },
      include: [{ model: Client, as: 'convertedCustomer', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
    });
  }

  async findForFunnelReport(filters: Record<string, any> = {}) {
    const where: any = {};
    if (filters.campaign_id) where.campaign_id = filters.campaign_id;
    if (filters.lead_source) where.lead_source = filters.lead_source;
    if (filters.date_from || filters.date_to) {
      where.created_at = {};
      if (filters.date_from) where.created_at[Op.gte] = filters.date_from;
      if (filters.date_to) where.created_at[Op.lte] = filters.date_to;
    }

    return MarketingLead.findAll({
      where,
      attributes: [
        'id', 'status', 'campaign_id', 'lead_source', 'qualified_at', 'handoff_at',
        'converted_at', 'converted_to_customer_id', 'created_at',
      ],
      raw: true,
    });
  }
}

export = SequelizeLeadRepository;
