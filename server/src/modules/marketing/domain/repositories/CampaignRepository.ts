/**
 * Contrato de repositório para o domínio de Campanhas de Marketing
 * (`MarketingCampaign`), módulo Marketing.
 *
 * @module modules/marketing/domain/repositories/CampaignRepository
 */

class CampaignRepository {
  /**
   * Lista campanhas paginadas, com filtros opcionais de `status`/`campaign_type`.
   *
   * @abstract
   */
  async listCampaigns(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('CampaignRepository.listCampaigns não implementado.');
  }

  /**
   * Busca uma campanha por id.
   *
   * @abstract
   */
  async findCampaignById(_id: number): Promise<any | null> {
    throw new Error('CampaignRepository.findCampaignById não implementado.');
  }

  /**
   * Cria uma campanha.
   *
   * @abstract
   */
  async createCampaign(_data: Record<string, any>): Promise<any> {
    throw new Error('CampaignRepository.createCampaign não implementado.');
  }

  /**
   * Atualiza uma campanha existente.
   *
   * @abstract
   */
  async updateCampaign(_id: number, _data: Record<string, any>): Promise<any | null> {
    throw new Error('CampaignRepository.updateCampaign não implementado.');
  }
}

export = CampaignRepository;
