/**
 * Use case: inativar (soft delete) um departamento.
 *
 * @module modules/departments/application/use-cases/DeactivateDepartmentUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import DepartmentsRepository from '../../domain/repositories/DepartmentsRepository';

class DeactivateDepartmentUseCase extends UseCase<{ id: number | string }, { message: string }> {
  private readonly departmentsRepository: DepartmentsRepository;

  /** @param departmentsRepository - Repositorio de departamentos. */
  public constructor(departmentsRepository: DepartmentsRepository) {
    super();
    this.departmentsRepository = departmentsRepository;
  }

  /**
   * @param input - Id do departamento.
   * @returns Mensagem de confirmação.
   * @throws {NotFoundError} Se o departamento não existir.
   */
  public async execute({ id }: { id: number | string }): Promise<{ message: string }> {
    const updated = await this.departmentsRepository.update(id, { active: false });
    if (!updated) {
      throw new NotFoundError('Departamento não encontrado');
    }
    return { message: 'Departamento inativado com sucesso' };
  }
}

export = DeactivateDepartmentUseCase;
