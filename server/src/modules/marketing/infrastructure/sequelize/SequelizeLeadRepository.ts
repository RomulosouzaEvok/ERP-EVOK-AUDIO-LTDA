/**
 * Implementação Sequelize/PostgreSQL do {@link LeadRepository}.
 *
 * @module modules/marketing/infrastructure/sequelize/SequelizeLeadRepository
 */

const LeadRepository = require('../../domain/repositories/LeadRepository');
const { MarketingLead, MarketingCampaign, Client } = require('../../../../models/index');

class SequelizeLeadRepository extends LeadRepository {
  async listLeads(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.campaign_id) where.campaign_id = filters.campaign_id;
    if (filters.lead_source) where.lead_source = filters.lead_source;

    const { count, rows } = await MarketingLead.findAndCountAll({
      where,
      include: [
        { model: MarketingCampaign, as: 'campaign', attributes: ['id', 'name'] },
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
        { model: Client, as: 'convertedCustomer', attributes: ['id', 'name'] },
      ],
    });
  }

  async createLead(data: Record<string, unknown>) {
    const created = await MarketingLead.create(data);
    return this.findLeadById(created.id);
  }

  async updateLead(id: number, data: Record<string, unknown>) {
    const lead = await MarketingLead.findByPk(id);
    if (!lead) return null;
    await lead.update(data);
    return this.findLeadById(id);
  }
}

export = SequelizeLeadRepository;
