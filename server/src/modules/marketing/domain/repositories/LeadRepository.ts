/**
 * Contrato de repositório para o domínio de Leads de Marketing
 * (`MarketingLead`), módulo Marketing.
 *
 * @module modules/marketing/domain/repositories/LeadRepository
 */

class LeadRepository {
  /**
   * Lista leads paginados, com filtros opcionais de `status`/`campaign_id`/`lead_source`.
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
   * Atualiza um lead existente (dados cadastrais — não o funil de status).
   *
   * @abstract
   */
  async updateLead(_id: number, _data: Record<string, any>): Promise<any | null> {
    throw new Error('LeadRepository.updateLead não implementado.');
  }
}

export = LeadRepository;
