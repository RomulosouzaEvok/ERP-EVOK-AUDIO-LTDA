/**
 * Use case: desligar (soft delete) um funcionário.
 *
 * @module modules/employees/application/use-cases/DeactivateEmployeeUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import EmployeesRepository from '../../domain/repositories/EmployeesRepository';

class DeactivateEmployeeUseCase extends UseCase<{ id: number | string }, { message: string }> {
  private readonly employeesRepository: EmployeesRepository;

  /** @param employeesRepository - Repositorio de funcionários. */
  public constructor(employeesRepository: EmployeesRepository) {
    super();
    this.employeesRepository = employeesRepository;
  }

  /**
   * @param input - Id do funcionário.
   * @returns Mensagem de confirmação.
   * @throws {NotFoundError} Se o funcionário não existir.
   */
  public async execute({ id }: { id: number | string }): Promise<{ message: string }> {
    const updated = await this.employeesRepository.update(id, { status: 'inactive', dismissal_date: new Date() });
    if (!updated) {
      throw new NotFoundError('Funcionário não encontrado');
    }
    return { message: 'Funcionário desligado com sucesso' };
  }
}

export = DeactivateEmployeeUseCase;
