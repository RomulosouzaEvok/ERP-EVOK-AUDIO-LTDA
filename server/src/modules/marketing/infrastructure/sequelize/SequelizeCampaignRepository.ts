/**
 * Implementação Sequelize/PostgreSQL do {@link CampaignRepository}.
 *
 * @module modules/marketing/infrastructure/sequelize/SequelizeCampaignRepository
 */

const CampaignRepository = require('../../domain/repositories/CampaignRepository');
const { MarketingCampaign } = require('../../../../models/index');

class SequelizeCampaignRepository extends CampaignRepository {
  async listCampaigns(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.campaign_type) where.campaign_type = filters.campaign_type;

    const { count, rows } = await MarketingCampaign.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['start_date', 'DESC']],
    });

    return { rows, count };
  }

  async findCampaignById(id: number) {
    return MarketingCampaign.findByPk(id);
  }

  async createCampaign(data: Record<string, unknown>) {
    return MarketingCampaign.create(data);
  }

  async updateCampaign(id: number, data: Record<string, unknown>) {
    const campaign = await MarketingCampaign.findByPk(id);
    if (!campaign) return null;
    await campaign.update(data);
    return campaign;
  }
}

export = SequelizeCampaignRepository;
