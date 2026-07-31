/**
 * Use case: buscar funcionário por id.
 *
 * @module modules/employees/application/use-cases/GetEmployeeByIdUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import EmployeesRepository from '../../domain/repositories/EmployeesRepository';

class GetEmployeeByIdUseCase extends UseCase<{ id: number | string }, any> {
  private readonly employeesRepository: EmployeesRepository;

  /** @param employeesRepository - Repositorio de funcionários. */
  public constructor(employeesRepository: EmployeesRepository) {
    super();
    this.employeesRepository = employeesRepository;
  }

  /**
   * @param input - Id do funcionário.
   * @returns Funcionário encontrado.
   * @throws {NotFoundError} Se o funcionário não existir.
   */
  public async execute({ id }: { id: number | string }): Promise<any> {
    const employee = await this.employeesRepository.findById(id);
    if (!employee) {
      throw new NotFoundError('Funcionário não encontrado');
    }
    return employee;
  }
}

export = GetEmployeeByIdUseCase;
