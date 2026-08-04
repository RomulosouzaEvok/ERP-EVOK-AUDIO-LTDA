/**
 * Contrato do repositorio de Fornecedores.
 *
 * @module modules/suppliers/domain/repositories/SuppliersRepository
 */

interface SuppliersListOptions {
  limit: number;
  offset: number;
  search?: string;
  status?: string;
}

class SuppliersRepository {
  /** @param options - Filtros e paginacao. @returns Linhas e contagem. @throws {Error} Se nao implementado. */
  public async list(options: SuppliersListOptions): Promise<{ rows: any[]; count: number }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('SuppliersRepository.list não implementado.');
  }

  /** @param id - Id do fornecedor. @returns Fornecedor ou null. @throws {Error} Se nao implementado. */
  public async findById(id: number): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('SuppliersRepository.findById não implementado.');
  }

  /** @param data - Dados do fornecedor. @returns Fornecedor criado. @throws {Error} Se nao implementado. */
  public async create(data: Record<string, unknown>): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('SuppliersRepository.create não implementado.');
  }

  /** @param id - Id do fornecedor. @param data - Campos a atualizar. @returns Linhas afetadas. @throws {Error} Se nao implementado. */
  public async update(id: number, data: Record<string, unknown>): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('SuppliersRepository.update não implementado.');
  }

  /** @param supplierId - Id do fornecedor. @returns Total de compras pendentes. @throws {Error} Se nao implementado. */
  public async countPendingPurchases(supplierId: number): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('SuppliersRepository.countPendingPurchases não implementado.');
  }
}

export = SuppliersRepository;
