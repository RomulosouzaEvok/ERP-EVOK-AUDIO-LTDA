/**
 * Use case: listar departamentos ativos.
 *
 * @module modules/departments/application/use-cases/ListDepartmentsUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import DepartmentsRepository from '../../domain/repositories/DepartmentsRepository';

class ListDepartmentsUseCase extends UseCase<void, any[]> {
  private readonly departmentsRepository: DepartmentsRepository;

  /** @param departmentsRepository - Repositorio de departamentos. */
  public constructor(departmentsRepository: DepartmentsRepository) {
    super();
    this.departmentsRepository = departmentsRepository;
  }

  /** @returns Departamentos ativos ordenados por nome. */
  public async execute(): Promise<any[]> {
    return this.departmentsRepository.listActive();
  }
}

export = ListDepartmentsUseCase;
