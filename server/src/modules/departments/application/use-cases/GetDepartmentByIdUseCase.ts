/**
 * Use case: buscar departamento por id.
 *
 * @module modules/departments/application/use-cases/GetDepartmentByIdUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import DepartmentsRepository from '../../domain/repositories/DepartmentsRepository';

class GetDepartmentByIdUseCase extends UseCase<{ id: number | string }, any> {
  private readonly departmentsRepository: DepartmentsRepository;

  /** @param departmentsRepository - Repositorio de departamentos. */
  public constructor(departmentsRepository: DepartmentsRepository) {
    super();
    this.departmentsRepository = departmentsRepository;
  }

  /**
   * @param input - Id do departamento.
   * @returns Departamento encontrado.
   * @throws {NotFoundError} Se o departamento não existir.
   */
  public async execute({ id }: { id: number | string }): Promise<any> {
    const department = await this.departmentsRepository.findById(id);
    if (!department) {
      throw new NotFoundError('Departamento não encontrado');
    }
    return department;
  }
}

export = GetDepartmentByIdUseCase;
