/**
 * Contrato do repositorio de Funcionários.
 *
 * @module modules/employees/domain/repositories/EmployeesRepository
 */

class EmployeesRepository {
  /**
   * @param filters - Filtros de busca (search, status, department_id).
   * @param pagination - Paginacao (limit, offset).
   * @returns Linhas encontradas e contagem total.
   * @throws {Error} Se nao implementado.
   */
  public async findAndCountAll(
    filters: Record<string, unknown>, // eslint-disable-line @typescript-eslint/no-unused-vars
    pagination: { limit: number; offset: number } // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<{ count: number; rows: any[] }> {
    throw new Error('EmployeesRepository.findAndCountAll não implementado.');
  }

  /** @param id - Id do funcionário. @returns Funcionário ou null. @throws {Error} Se nao implementado. */
  public async findById(id: number | string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EmployeesRepository.findById não implementado.');
  }

  /** @param data - Dados do funcionário. @returns Funcionário criado. @throws {Error} Se nao implementado. */
  public async create(data: Record<string, unknown>): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EmployeesRepository.create não implementado.');
  }

  /** @param id - Id do funcionário. @param data - Campos a atualizar. @returns Linhas afetadas. @throws {Error} Se nao implementado. */
  public async update(id: number | string, data: Record<string, unknown>): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EmployeesRepository.update não implementado.');
  }
}

export = EmployeesRepository;
