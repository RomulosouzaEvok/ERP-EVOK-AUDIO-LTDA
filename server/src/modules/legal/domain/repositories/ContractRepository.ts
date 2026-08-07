/**
 * Contrato de repositório para o domínio de Contrato (`LegalContract`),
 * módulo Jurídico.
 *
 * @module modules/legal/domain/repositories/ContractRepository
 */

class ContractRepository {
  /**
   * Lista contratos paginados, com filtros opcionais de `status`/`contract_type`.
   *
   * @abstract
   */
  async listContracts(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('ContractRepository.listContracts não implementado.');
  }

  /**
   * Busca um contrato por id.
   *
   * @abstract
   */
  async findContractById(_id: number): Promise<any | null> {
    throw new Error('ContractRepository.findContractById não implementado.');
  }

  /**
   * Busca um contrato pelo número (único).
   *
   * @abstract
   */
  async findContractByNumber(_contractNumber: string): Promise<any | null> {
    throw new Error('ContractRepository.findContractByNumber não implementado.');
  }

  /**
   * Cria um contrato.
   *
   * @abstract
   */
  async createContract(_data: Record<string, any>): Promise<any> {
    throw new Error('ContractRepository.createContract não implementado.');
  }

  /**
   * Atualiza um contrato existente.
   *
   * @abstract
   */
  async updateContract(_id: number, _data: Record<string, any>): Promise<any | null> {
    throw new Error('ContractRepository.updateContract não implementado.');
  }

  /**
   * Lista contratos com `end_date` vencendo dentro de `days` dias (a partir
   * de hoje, inclusive vencidos), excluindo `status` `terminated`.
   *
   * @abstract
   */
  async listExpiringContracts(_days: number): Promise<any[]> {
    throw new Error('ContractRepository.listExpiringContracts não implementado.');
  }
}

export = ContractRepository;
