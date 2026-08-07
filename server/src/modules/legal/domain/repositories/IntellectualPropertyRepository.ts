/**
 * Contrato de repositório para o domínio de Propriedade Intelectual
 * (`LegalIntellectualProperty`), módulo Jurídico.
 *
 * @module modules/legal/domain/repositories/IntellectualPropertyRepository
 */

class IntellectualPropertyRepository {
  /**
   * Lista ativos de PI paginados, com filtros opcionais de `ip_type`/`status`.
   *
   * @abstract
   */
  async listIntellectualProperty(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('IntellectualPropertyRepository.listIntellectualProperty não implementado.');
  }

  /**
   * Busca um ativo de PI por id.
   *
   * @abstract
   */
  async findIntellectualPropertyById(_id: number): Promise<any | null> {
    throw new Error('IntellectualPropertyRepository.findIntellectualPropertyById não implementado.');
  }

  /**
   * Cria um ativo de PI.
   *
   * @abstract
   */
  async createIntellectualProperty(_data: Record<string, any>): Promise<any> {
    throw new Error('IntellectualPropertyRepository.createIntellectualProperty não implementado.');
  }

  /**
   * Atualiza um ativo de PI existente.
   *
   * @abstract
   */
  async updateIntellectualProperty(_id: number, _data: Record<string, any>): Promise<any | null> {
    throw new Error('IntellectualPropertyRepository.updateIntellectualProperty não implementado.');
  }

  /**
   * Lista ativos de PI com `expiration_date` vencendo dentro de `days` dias
   * (a partir de hoje, inclusive vencidos), excluindo `status`
   * `expired`/`abandoned`.
   *
   * @abstract
   */
  async listExpiringIntellectualProperty(_days: number): Promise<any[]> {
    throw new Error('IntellectualPropertyRepository.listExpiringIntellectualProperty não implementado.');
  }
}

export = IntellectualPropertyRepository;
