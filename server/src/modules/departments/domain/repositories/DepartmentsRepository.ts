/**
 * Contrato do repositorio de Departamentos.
 *
 * @module modules/departments/domain/repositories/DepartmentsRepository
 */

class DepartmentsRepository {
  /** @returns Departamentos ativos ordenados por nome. @throws {Error} Se nao implementado. */
  public async listActive(): Promise<any[]> {
    throw new Error('DepartmentsRepository.listActive não implementado.');
  }

  /** @param id - Id do departamento. @returns Departamento ou null. @throws {Error} Se nao implementado. */
  public async findById(id: number | string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('DepartmentsRepository.findById não implementado.');
  }

  /** @param data - Dados do departamento. @returns Departamento criado. @throws {Error} Se nao implementado. */
  public async create(data: Record<string, unknown>): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('DepartmentsRepository.create não implementado.');
  }

  /** @param id - Id do departamento. @param data - Campos a atualizar. @returns Linhas afetadas. @throws {Error} Se nao implementado. */
  public async update(id: number | string, data: Record<string, unknown>): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('DepartmentsRepository.update não implementado.');
  }
}

export = DepartmentsRepository;
