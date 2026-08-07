/**
 * Contrato do repositorio de Clientes.
 *
 * @module modules/clients/domain/repositories/ClientsRepository
 */

import { ClientsListOptions } from './ClientsListOptions';

class ClientsRepository {
  /** @param options - Filtros e paginacao. @returns Linhas e contagem. @throws {Error} Se nao implementado. */
  public async list(options: ClientsListOptions): Promise<{ rows: any[]; count: number }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('ClientsRepository.list não implementado.');
  }

  /** @param id - Id do cliente. @returns Cliente ou null. @throws {Error} Se nao implementado. */
  public async findById(id: number): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('ClientsRepository.findById não implementado.');
  }

  /**
   * @param data - Dados do cliente.
   * @param transaction - Transação Sequelize opcional (para criação atômica
   * a partir de outro módulo, ex. `modules/marketing/.../ConvertLeadUseCase`).
   * @returns Cliente criado.
   * @throws {Error} Se nao implementado.
   */
  public async create(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('ClientsRepository.create não implementado.');
  }

  /** @param id - Id do cliente. @param data - Campos a atualizar. @returns Linhas afetadas. @throws {Error} Se nao implementado. */
  public async update(id: number, data: Record<string, unknown>): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('ClientsRepository.update não implementado.');
  }

  /** @param clientId - Id do cliente. @returns Total de vendas ativas. @throws {Error} Se nao implementado. */
  public async countActiveSales(clientId: number): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('ClientsRepository.countActiveSales não implementado.');
  }
}

export = ClientsRepository;
