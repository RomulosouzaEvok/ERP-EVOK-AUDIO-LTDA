/**
 * Contrato de repositório para o domínio de Leads de Marketing
 * (`MarketingLead`), módulo Marketing.
 *
 * @module modules/marketing/domain/repositories/LeadRepository
 */

class LeadRepository {
  /**
   * Lista leads paginados, com filtros opcionais de `status`/`campaign_id`/
   * `lead_source`/`event_id`/`sales_owner_user_id`/`sla_breached`/
   * `data_issue_flag` (RF-MKT §4.1).
   *
   * @abstract
   */
  async listLeads(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('LeadRepository.listLeads não implementado.');
  }

  /**
   * Busca um lead por id.
   *
   * @abstract
   */
  async findLeadById(_id: number): Promise<any | null> {
    throw new Error('LeadRepository.findLeadById não implementado.');
  }

  /**
   * Cria um lead.
   *
   * @abstract
   */
  async createLead(_data: Record<string, any>): Promise<any> {
    throw new Error('LeadRepository.createLead não implementado.');
  }

  /**
   * Atualiza um lead existente (dados cadastrais, funil ou conversão).
   *
   * @param _id - Id do lead.
   * @param _data - Campos a atualizar.
   * @param _transaction - Transação Sequelize opcional (conversão atômica, RF-MKT-002).
   * @abstract
   */
  async updateLead(_id: number, _data: Record<string, any>, _transaction?: unknown): Promise<any | null> {
    throw new Error('LeadRepository.updateLead não implementado.');
  }

  /**
   * Busca um lead ABERTO (status não `converted`/`lost`) por e-mail OU
   * telefone normalizado — usado pela deduplicação (RF-MKT-018).
   *
   * @abstract
   */
  async findOpenLeadByContact(_email: string | null, _phone: string | null): Promise<any | null> {
    throw new Error('LeadRepository.findOpenLeadByContact não implementado.');
  }

  /**
   * Conta leads vinculados a uma campanha (RF-MKT-009, cache de `leads_generated`).
   *
   * @abstract
   */
  async countByCampaignId(_campaignId: number): Promise<number> {
    throw new Error('LeadRepository.countByCampaignId não implementado.');
  }

  /**
   * Lista leads `converted` vinculados a uma campanha, com
   * `converted_to_customer_id`/`converted_at` — base do recálculo de
   * `conversions`/`roi` (RF-MKT-008/009).
   *
   * @abstract
   */
  async findConvertedByCampaignId(_campaignId: number): Promise<Array<{ converted_to_customer_id: number; converted_at: Date | null }>> {
    throw new Error('LeadRepository.findConvertedByCampaignId não implementado.');
  }

  /**
   * Lista leads vinculados a um evento (RF-MKT-023/024/027).
   *
   * @abstract
   */
  async findByEventId(_eventId: number): Promise<any[]> {
    throw new Error('LeadRepository.findByEventId não implementado.');
  }

  /**
   * Lista leads (sem paginação) para agregação do relatório de funil
   * (RF-MKT-026), com filtros opcionais de `campaign_id`/`lead_source`/
   * período.
   *
   * @abstract
   */
  async findForFunnelReport(_filters: Record<string, any>): Promise<any[]> {
    throw new Error('LeadRepository.findForFunnelReport não implementado.');
  }
}

export = LeadRepository;
