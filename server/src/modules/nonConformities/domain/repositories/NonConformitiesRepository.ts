/**
 * Contrato do repositorio de Não Conformidades.
 *
 * @module modules/nonConformities/domain/repositories/NonConformitiesRepository
 */

class NonConformitiesRepository {
  /**
   * @param filters - Filtros de busca (status, severity).
   * @param pagination - Paginacao (limit, offset).
   * @returns Linhas encontradas e contagem total.
   * @throws {Error} Se nao implementado.
   */
  public async findAndCountAll(
    filters: Record<string, unknown>, // eslint-disable-line @typescript-eslint/no-unused-vars
    pagination: { limit: number; offset: number } // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<{ count: number; rows: any[] }> {
    throw new Error('NonConformitiesRepository.findAndCountAll não implementado.');
  }

  /** @param id - Id da não conformidade. @returns Registro ou null. @throws {Error} Se nao implementado. */
  public async findById(id: number | string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('NonConformitiesRepository.findById não implementado.');
  }

  /**
   * @param data - Dados da não conformidade.
   * @param transaction - Transação Sequelize opcional (usada quando a criação
   *   precisa ficar atômica com efeitos colaterais, ex.: bloqueio de lote).
   * @returns Registro criado.
   * @throws {Error} Se nao implementado.
   */
  public async create(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('NonConformitiesRepository.create não implementado.');
  }

  /**
   * @param id - Id da não conformidade.
   * @param data - Campos a atualizar.
   * @param transaction - Transação Sequelize opcional (usada quando a atualização
   *   precisa ficar atômica com efeitos colaterais, ex.: devolução ao fornecedor).
   * @returns Linhas afetadas.
   * @throws {Error} Se nao implementado.
   */
  public async update(id: number | string, data: Record<string, unknown>, transaction?: unknown): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('NonConformitiesRepository.update não implementado.');
  }

  /**
   * Busca um lote (`LotControl`) por produto e número de lote, com lock
   * pessimista (leitura/escrita cross-module pontual — `LotControl`
   * pertence ao módulo de estoque/inventário, não a `nonConformities`; usado
   * para bloquear o lote referenciado por uma RNC na mesma transação).
   *
   * @param productId - Id do produto.
   * @param lotNumber - Número do lote (já normalizado/trim pelo use case).
   * @param transaction - Transação Sequelize compartilhada.
   * @returns Lote encontrado ou null.
   * @throws {Error} Se nao implementado.
   */
  public async findLotForNonConformity(
    productId: number, // eslint-disable-line @typescript-eslint/no-unused-vars
    lotNumber: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    transaction: unknown // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<any | null> {
    throw new Error('NonConformitiesRepository.findLotForNonConformity não implementado.');
  }

  /**
   * Conta quantos lotes (recebimentos) um fornecedor tem (leitura
   * cross-module pontual — `LotControl`), usado no recálculo de
   * `suppliers.quality_score`.
   *
   * @param supplierId - Id do fornecedor.
   * @param transaction - Transação Sequelize compartilhada.
   * @returns Contagem de lotes do fornecedor.
   * @throws {Error} Se nao implementado.
   */
  public async countLotsBySupplier(supplierId: number, transaction: unknown): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('NonConformitiesRepository.countLotsBySupplier não implementado.');
  }

  /**
   * Conta quantas não conformidades um fornecedor tem, usado no recálculo
   * de `suppliers.quality_score`.
   *
   * @param supplierId - Id do fornecedor.
   * @param transaction - Transação Sequelize compartilhada.
   * @returns Contagem de RNCs do fornecedor.
   * @throws {Error} Se nao implementado.
   */
  public async countNonConformitiesBySupplier(supplierId: number, transaction: unknown): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('NonConformitiesRepository.countNonConformitiesBySupplier não implementado.');
  }

  /**
   * Atualiza `suppliers.quality_score` (escrita cross-module pontual —
   * `Supplier` pertence ao módulo `purchases`).
   *
   * @param supplierId - Id do fornecedor.
   * @param qualityScore - Novo score calculado.
   * @param transaction - Transação Sequelize compartilhada.
   * @returns void
   * @throws {Error} Se nao implementado.
   */
  public async updateSupplierQualityScore(supplierId: number, qualityScore: number, transaction: unknown): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('NonConformitiesRepository.updateSupplierQualityScore não implementado.');
  }
}

export = NonConformitiesRepository;
