/**
 * Interface de serviço para consulta/criação de `Client` a partir do
 * módulo `marketing` (RF-MKT-001/002/003, UC-63), sem import direto do
 * model nem do repositório do módulo `clients` — mesmo precedente de
 * `MaintenanceOrderService` (`modules/ti/application/services/`).
 * Implementada por `ClientServiceAdapter`.
 *
 * @module modules/marketing/application/services/ClientService
 */

class ClientService {
  /**
   * @param _id - Id do cliente.
   * @returns Cliente ou `null` se não encontrado.
   * @abstract
   */
  public async findById(_id: number): Promise<any | null> {
    throw new Error('ClientService.findById não implementado.');
  }

  /**
   * @param _query - Filtros de busca (nome/CPF-CNPJ/telefone/e-mail).
   * @returns Clientes encontrados.
   * @abstract
   */
  public async search(_query: { name?: string; cpf_cnpj?: string; phone?: string; email?: string }): Promise<any[]> {
    throw new Error('ClientService.search não implementado.');
  }

  /**
   * @param _data - Dados do cliente a criar.
   * @param _transaction - Transação Sequelize opcional (conversão atômica de lead, RF-MKT-002).
   * @returns Cliente criado.
   * @abstract
   */
  public async create(_data: Record<string, unknown>, _transaction?: unknown): Promise<any> {
    throw new Error('ClientService.create não implementado.');
  }
}

export = ClientService;
