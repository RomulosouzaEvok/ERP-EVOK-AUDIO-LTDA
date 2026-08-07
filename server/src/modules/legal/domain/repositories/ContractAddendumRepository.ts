/**
 * Contrato de repositório para o domínio de Aditivo Contratual
 * (`LegalContractAddendum`), módulo Jurídico.
 *
 * @module modules/legal/domain/repositories/ContractAddendumRepository
 */

class ContractAddendumRepository {
  /**
   * Lista aditivos paginados, com filtro opcional de `contract_id`.
   *
   * @abstract
   */
  async listAddendums(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('ContractAddendumRepository.listAddendums não implementado.');
  }

  /**
   * Busca um aditivo por id.
   *
   * @abstract
   */
  async findAddendumById(_id: number): Promise<any | null> {
    throw new Error('ContractAddendumRepository.findAddendumById não implementado.');
  }

  /**
   * Cria um aditivo.
   *
   * @abstract
   */
  async createAddendum(_data: Record<string, any>): Promise<any> {
    throw new Error('ContractAddendumRepository.createAddendum não implementado.');
  }

  /**
   * Atualiza um aditivo existente.
   *
   * @abstract
   */
  async updateAddendum(_id: number, _data: Record<string, any>): Promise<any | null> {
    throw new Error('ContractAddendumRepository.updateAddendum não implementado.');
  }
}

export = ContractAddendumRepository;
