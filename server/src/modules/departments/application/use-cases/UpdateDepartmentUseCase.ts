/**
 * Use case: atualizar um departamento existente.
 *
 * @module modules/departments/application/use-cases/UpdateDepartmentUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, ConflictError } from '../../../../errors';
import DepartmentsRepository from '../../domain/repositories/DepartmentsRepository';

interface UpdateDepartmentInput {
  id: number | string;
  body: {
    code?: string;
    name?: string;
    sigla?: string;
    description?: string;
    active?: boolean;
    manager_id?: number;
  };
}

class UpdateDepartmentUseCase extends UseCase<UpdateDepartmentInput, any> {
  private readonly departmentsRepository: DepartmentsRepository;

  /** @param departmentsRepository - Repositorio de departamentos. */
  public constructor(departmentsRepository: DepartmentsRepository) {
    super();
    this.departmentsRepository = departmentsRepository;
  }

  /**
   * @param input - Id do departamento e campos a atualizar.
   * @returns Departamento atualizado.
   * @throws {NotFoundError} Se o departamento não existir.
   * @throws {ConflictError} Se `code`/`name` já existirem (unicidade).
   */
  public async execute({ id, body }: UpdateDepartmentInput): Promise<any> {
    const { code, name, sigla, description, active, manager_id } = body;
    const updateData: Record<string, unknown> = {};
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (sigla !== undefined) updateData.sigla = sigla;
    if (description !== undefined) updateData.description = description;
    if (active !== undefined) updateData.active = active;
    if (manager_id !== undefined) updateData.manager_id = manager_id;

    try {
      const updated = await this.departmentsRepository.update(id, updateData);
      if (!updated) {
        throw new NotFoundError('Departamento não encontrado');
      }
      return this.departmentsRepository.findById(id);
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('Código ou nome já existe');
      }
      throw error;
    }
  }
}

export = UpdateDepartmentUseCase;
